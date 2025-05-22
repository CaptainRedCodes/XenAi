import { NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

// In-memory storage for conversation memories (in production, use Redis or database)
const conversationMemories = new Map();

// Initialize the Gemini model for chat
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  temperature: 0.7,
  maxOutputTokens: 2048,
  streaming: true,
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
});

// Create a summary model for memory (lighter model for summarization)
const summaryModel = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  temperature: 0.3,
  maxOutputTokens: 1024,
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
});

// Enhanced chat prompt template
const chatPrompt = ChatPromptTemplate.fromMessages([
  [
    "system", 
    `You are an advanced AI coding assistant and problem solver. Your capabilities include:

    🔧 **Technical Expertise:**
    - Writing, debugging, and explaining code in multiple languages
    - Providing architectural guidance and best practices
    - Solving complex programming problems step-by-step
    - Code review and optimization suggestions

    🎯 **Communication Style:**
    - Direct, helpful, and conversational responses
    - Clear explanations with practical examples
    - Use code blocks with proper syntax highlighting
    - Break down complex concepts into digestible parts

    💡 **Additional Features:**
    - Remember our conversation context for better assistance
    - Provide alternative solutions when appropriate
    - Ask clarifying questions when needed
    - Offer relevant tips and best practices

    Always aim to be helpful, accurate, and educational in your responses.`
  ],
  new MessagesPlaceholder("history"),
  ["human", "{input}"]
]);

// Function to get or create memory for a conversation with better error handling
function getOrCreateMemory(conversationId) {
  if (!conversationMemories.has(conversationId)) {
    try {
      const memory = new ConversationSummaryBufferMemory({
        llm: summaryModel,
        maxTokenLimit: 2000,
        returnMessages: true,
        memoryKey: "history",
      });
      
      // Initialize the chat memory if it doesn't exist
      if (!memory.chatMemory) {
        memory.chatMemory = { messages: [] };
      }
      
      conversationMemories.set(conversationId, memory);
    } catch (error) {
      console.error("Error creating memory:", error);
      // Create a fallback memory object
      const fallbackMemory = {
        chatMemory: { messages: [] },
        movingSummaryBuffer: null,
        loadMemoryVariables: async () => ({ history: [] }),
        saveContext: async () => {},
      };
      conversationMemories.set(conversationId, fallbackMemory);
    }
  }
  return conversationMemories.get(conversationId);
}

// Streaming POST endpoint
export async function POST(request) {
  try {
    const { message, conversationId = "default" } = await request.json();
    
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get memory for this conversation
    const memory = getOrCreateMemory(conversationId);
    
    // Load conversation history with error handling
    let memoryVariables;
    try {
      memoryVariables = await memory.loadMemoryVariables({});
    } catch (error) {
      console.error("Error loading memory variables:", error);
      memoryVariables = { history: [] };
    }
    
    // Create the chain
    const chain = RunnableSequence.from([
      chatPrompt,
      model,
      new StringOutputParser(),
    ]);

    // Set up streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream the response
          const streamResponse = await chain.stream({
            input: message,
            history: memoryVariables.history || [],
          });

          let fullResponse = "";
          let chunkCount = 0;
          
          for await (const chunk of streamResponse) {
            fullResponse += chunk;
            chunkCount++;
            
            // Send chunk to client
            const data = JSON.stringify({ 
              type: "chunk", 
              content: chunk,
              conversationId,
              chunkIndex: chunkCount
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Save the conversation to memory with error handling
          try {
            await memory.saveContext(
              { input: message },
              { output: fullResponse }
            );
          } catch (memoryError) {
            console.error("Error saving to memory:", memoryError);
            // Continue without saving to memory if there's an error
          }

          // Send completion signal
          const completionData = JSON.stringify({ 
            type: "complete", 
            fullResponse,
            conversationId,
            totalChunks: chunkCount
          });
          controller.enqueue(encoder.encode(`data: ${completionData}\n\n`));
          
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          const errorData = JSON.stringify({ 
            type: "error", 
            error: error.message,
            conversationId
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate response", details: error.message },
      { status: 500 }
    );
  }
}

// Non-streaming PUT endpoint (fallback)
export async function PUT(request) {
  try {
    const { message, conversationId = "default" } = await request.json();
    
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get memory for this conversation
    const memory = getOrCreateMemory(conversationId);
    
    // Load conversation history with error handling
    let memoryVariables;
    try {
      memoryVariables = await memory.loadMemoryVariables({});
    } catch (error) {
      console.error("Error loading memory variables:", error);
      memoryVariables = { history: [] };
    }
    
    // Create the chain (without streaming)
    const nonStreamingModel = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      temperature: 0.7,
      maxOutputTokens: 2048,
      streaming: false,
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    });

    const chain = RunnableSequence.from([
      chatPrompt,
      nonStreamingModel,
      new StringOutputParser(),
    ]);

    // Get response
    const response = await chain.invoke({
      input: message,
      history: memoryVariables.history || [],
    });

    // Save the conversation to memory with error handling
    try {
      await memory.saveContext(
        { input: message },
        { output: response }
      );
    } catch (memoryError) {
      console.error("Error saving to memory:", memoryError);
      // Continue without saving to memory if there's an error
    }

    const memoryStats = {
      tokenCount: 0,
      hasSummary: false
    };

    try {
      const chatMemory = memory.chatMemory || {};
      const messages = chatMemory.messages || [];
      memoryStats.tokenCount = messages.length;
      memoryStats.hasSummary = !!memory.movingSummaryBuffer;
    } catch (error) {
      console.error("Error getting memory stats:", error);
    }

    return NextResponse.json({ 
      aiResponse: response, 
      conversationId,
      memoryStats
    }, { status: 200 });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate response", details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for conversation summary and statistics
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId') || 'default';
    
    const memory = conversationMemories.get(conversationId);
    
    if (!memory) {
      return NextResponse.json({ 
        summary: "No conversation found for this workspace",
        messageCount: 0,
        recentMessages: [],
        conversationId
      });
    }

    const memoryVariables = await memory.loadMemoryVariables({});
    
    // Get conversation statistics with safe access
    const chatMemory = memory.chatMemory || {};
    const messages = chatMemory.messages || [];
    const messageCount = messages.length;
    const hasLongHistory = messageCount > 10;
    const recentMessages = memoryVariables.history?.slice(-4) || [];
    
    return NextResponse.json({
      conversationId,
      summary: memory.movingSummaryBuffer || "Conversation is still building context. No summary available yet.",
      messageCount,
      hasLongHistory,
      recentMessages: recentMessages.map(msg => {
        try {
          return {
            role: msg._getType ? msg._getType() : 'unknown',
            content: (msg.content || '').substring(0, 100) + ((msg.content || '').length > 100 ? '...' : ''),
            timestamp: new Date().toISOString()
          };
        } catch (err) {
          return {
            role: 'unknown',
            content: 'Error parsing message',
            timestamp: new Date().toISOString()
          };
        }
      }),
      memoryStats: {
        bufferSize: memory.movingSummaryBuffer?.length || 0,
        chatMemorySize: messageCount,
        isUsingCompression: !!memory.movingSummaryBuffer
      }
    });

  } catch (error) {
    console.error("Memory retrieval error:", error);
    const { searchParams } = new URL(request.url);
    return NextResponse.json(
      { 
        error: "Failed to retrieve conversation summary", 
        details: error.message,
        conversationId: searchParams.get('conversationId') || 'default'
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to clear conversation memory
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId') || 'default';
    
    if (conversationMemories.has(conversationId)) {
      conversationMemories.delete(conversationId);
      return NextResponse.json({ 
        message: "Conversation memory cleared successfully",
        conversationId 
      });
    }
    
    return NextResponse.json({ 
      message: "No conversation found to clear",
      conversationId 
    });

  } catch (error) {
    console.error("Memory deletion error:", error);
    return NextResponse.json(
      { error: "Failed to clear conversation memory", details: error.message },
      { status: 500 }
    );
  }
}

// OPTIONS endpoint for CORS
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}