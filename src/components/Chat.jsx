"use client";
import { useState, useEffect, useRef } from "react";
import { auth, firestore } from "@/config/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  doc,
  getDocs,
  where
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { ClipboardDocumentIcon, CheckIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { MessageSquarePlus, Send, Sparkles, Trash, Trash2, X, XCircle, FileText, ArrowDownToLine } from "lucide-react";
import CodeDiffViewer from './CodeDiffViewer';
import { compareCode } from '../utils/codeCompare';

function Chatroom({ workspaceId, setIsChatOpen }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Gemini");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [files, setFiles] = useState([]);
  const fileSelectorRef = useRef(null);

  useEffect(() => {
    if (workspaceId) {
      const fetchFiles = async () => {
        try {
          const filesRef = collection(db, `workspaces/${workspaceId}/files`);
          const filesSnapshot = await getDocs(filesRef);
          const filesData = filesSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            content: doc.data().content,
            ...doc.data()
          }));
          setFiles(filesData);
        } catch (error) {
          console.error('Error fetching files:', error);
        }
      };
      fetchFiles();
    }
  }, [workspaceId]);

  // Handle click outside file selector
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fileSelectorRef.current && !fileSelectorRef.current.contains(event.target)) {
        setShowFileSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFileSelector = () => setShowFileSelector(!showFileSelector);

  const handleFileSelect = (file) => {
    if (!selectedFiles.find(f => f.name === file.name)) {
      setSelectedFiles([...selectedFiles, file]);
    }
    setShowFileSelector(false);
  };

  const userId = auth.currentUser.uid;
  const name = auth.currentUser.displayName;

  const messagesRef = collection(firestore, "messages");
  const messagesQuery = query(messagesRef, orderBy("createdAt"));

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!workspaceId) return;

    setLoading(true);

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((msg) => msg.workspaceId === workspaceId);

      setMessages(messagesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [workspaceId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, newMessage, isAIProcessing]);

  const generateAIResponse = async (prompt) => {
    setIsAIProcessing(true);
    try {
      const response = await fetch('/api/getChatResponse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: prompt }),
      });
  
      if (!response.ok) {
        throw new Error('API request failed');
      }
  
      const data = await response.json();
      return data.aiResponse;
    } catch (error) {
      console.error("API Error:", error);
      return "Sorry, I couldn't process that request. Please try again.";
    } finally {
      setIsAIProcessing(false);
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim() === "") return;

    const imageUrl = auth.currentUser.photoURL;
    const aiMatch = newMessage.match(/@X(.+)/);
    let aiPrompt = null;
    let userMessage = newMessage;

    // New command to fetch file contents
    const fileMatch = newMessage.match(/@file\s+(\S+)/);
    let fileName = null;
    if (fileMatch) {
      fileName = fileMatch[1].trim();
    }

    console.log(aiMatch);
    if (aiMatch) {
      aiPrompt = aiMatch[1].trim();
    }

    try {
      if (userMessage && !fileName) {
        await addDoc(messagesRef, {
          text: userMessage,
          createdAt: serverTimestamp(),
          imageUrl,
          userId,
          name,
          workspaceId,
        });
      }



      if (aiPrompt) {
        const aiResponse = await generateAIResponse(aiPrompt);
        await addDoc(messagesRef, {
          text: `🤖 ${aiResponse}`,
          createdAt: serverTimestamp(),
          imageUrl: "/ai-avatar.png",
          userId: "AI_BOT",
          name: "CodeBot",
          workspaceId,
        });
      }

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const clearChat = async () => {
    try {
      const querySnapshot = await getDocs(
        query(messagesRef, where("workspaceId", "==", workspaceId))
      );
      
      const deletePromises = querySnapshot.docs.map((docItem) => deleteDoc(doc(messagesRef, docItem.id)));
      await Promise.all(deletePromises);
      setMessages([]);
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const MessageBubble = ({ msg }) => {
    const isCurrentUser = msg.userId === userId;
    const isAI = msg.userId === "AI_BOT";
    const [copiedCode, setCopiedCode] = useState(null);
    const [showDiffViewer, setShowDiffViewer] = useState(false);
    const [currentCode, setCurrentCode] = useState('');

    const parseMessage = (text) => {
      const parts = [];
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      let lastIndex = 0;
      let match;

      while ((match = codeBlockRegex.exec(text)) !== null) {
        const [fullMatch, lang, code] = match;
        const startIndex = match.index;
        const endIndex = codeBlockRegex.lastIndex;

        if (startIndex > lastIndex) {
          parts.push({
            type: 'text',
            content: text.substring(lastIndex, startIndex)
          });
        }

        parts.push({
          type: 'code',
          lang: lang || 'text',
          code: code.trim()
        });

        lastIndex = endIndex;
      }

      if (lastIndex < text.length) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex)
        });
      }

      return parts;
    };

    const copyToClipboard = async (code, index) => {
      await navigator.clipboard.writeText(code);
      setCopiedCode(index);
      setTimeout(() => setCopiedCode(null), 2000);
    };

    return (
      <div className={`flex flex-col gap-1  ${
        isCurrentUser ? "items-end" : 
        isAI ? "items-center w-full" : "items-start"
      }`}>
        {!isAI && (
          <span className="text-xs text-gray-400">
            {isCurrentUser ? "You" : msg.name}
          </span>
        )}
        
        <div className="flex justify-end gap-2">
          {!isCurrentUser && !isAI && (
            <img
              src={msg.imageUrl || "/robotic.png"}
              alt="Avatar"
              className="w-6 h-6 rounded-full flex-shrink-0"
            />
          )}

          <div className={`py-2 px-4 text-sm rounded-2xl mx-auto max-w-[550px] break-words ${
            isAI ? "bg-green-900/20 border ring-1 ring-green-400" :
            isCurrentUser ? "bg-purple-600/60" : "bg-blue-600/60 "
          }`}>
            {isAI && <span className="text-blue-400 mr-2"></span>}
            
            {parseMessage(msg.text).map((part, index) => {
              if (part.type === 'text') {
                return (
                  <span key={index} className="whitespace-pre-wrap">
                    {part.content}
                  </span>
                );
              }
              
              if (part.type === 'code') {
                return (
                  <div key={index} className="relative my-2 group">
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyToClipboard(part.code, index)}
                        className="p-1 rounded bg-gray-700/50 hover:bg-gray-600/50 backdrop-blur-sm"
                        title="Copy code"
                      >
                        {copiedCode === index ? (
                          <CheckIcon className="h-4 w-4 text-green-400" />
                        ) : (
                          <ClipboardDocumentIcon className="h-4 w-4 text-gray-300" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setCurrentCode(part.code);
                          setShowDiffViewer(true);
                        }}
                        className="p-1 rounded bg-gray-700/50 hover:bg-gray-600/50 backdrop-blur-sm"
                        title="Apply code"
                      >
                        <CheckIcon className="h-4 w-4 text-green-400" />
                      </button>
                    </div>
                    <SyntaxHighlighter
                      language={part.lang}
                      style={vscDarkPlus}
                      customStyle={{
                        background: '#000',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        margin: '0.5rem 0'
                      }}
                      codeTagProps={{ style: { fontFamily: 'Fira Code, monospace' } }}
                    >
                      {part.code}
                    </SyntaxHighlighter>
                  </div>
                );
              }
              
              return null;
            })}

            {isAI && (
              <div className="text-xs text-green-200/70 mt-1">
                AI-generated response
              </div>
            )}

            {showDiffViewer && (
              <CodeDiffViewer
                diffs={compareCode(currentCode, '/Users/mohdzub7/Desktop/XenAi/src/components/Editor.jsx')}
                onAccept={() => {
                  const editorFile = files.find(f => f.name === 'Editor.jsx');
                  if (editorFile) {
                    const fileRef = doc(db, `workspaces/${workspaceId}/files`, editorFile.id);
                    updateDoc(fileRef, { content: currentCode });
                  }
                  setShowDiffViewer(false);
                }}
                onReject={() => setShowDiffViewer(false)}
              />
            )}
          </div>

          {isCurrentUser && !isAI && (
            <img
              src={msg.imageUrl || "/robotic.png"}
              alt="Avatar"
              className="w-6 h-6 rounded-full flex-shrink-0"
            />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full backdrop-blur-sm border border-gray-500 rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 hover:shadow-3xl">
      {/* Header with glass effect */}
      <div className="flex justify-between items-center p-4 bg-gray-950/60 backdrop-blur-xl border-b-2 border-gray-600 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-900/20 rounded-lg border border-indigo-200/20">
            <Sparkles className="h-6 w-6 text-indigo-200" />
          </div>
          <h2 className="text-xl font-semibold shadow-2xl text-gray-100">
            Xen.ai Chat
            <span className="text-indigo-400/90 text-sm font-normal ml-2">v1.2</span>
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={clearChat}
            className="px-3 py-2 text-sm bg-gray-700/50 hover:bg-gray-600/60 text-gray-300 rounded-xl flex items-center gap-2 transition-all duration-200 hover:scale-[1.02]"
          >
            <Trash className="h-4 w-4 text-red-500" />
            <span>Clear</span>
          </Button>
          <Button
            onClick={() => setIsChatOpen(false)}
            className="p-2 bg-gray-700/50 hover:bg-gray-600/60 text-white rounded-xl transition-all duration-200 hover:scale-[1.02]"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-800/60 ">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm animate-fade-in">
            <div className="mb-4 animate-float">
              <MessageSquarePlus className="h-8 w-8 opacity-60" />
            </div>
            <p>Start a conversation with AI</p>
            <p className="text-sm mt-1 text-gray-500/70">Type @ followed by your query</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              msg={msg}
              className="animate-message-enter"
            />
          ))
        )}

        {isAIProcessing && (
          <div className="flex justify-center animate-pulse">
            <div className="flex items-center gap-3 text-indigo-300 text-sm py-2 px-4 rounded-full bg-gray-700/50 border border-indigo-500/20">
              <div className="flex space-x-1">
                <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0s'}} />
                <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
              </div>
              <span>Analyzing request...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="p-4 border-t border-gray-600/30 bg-gray-800/60 backdrop-blur-sm">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex flex-col gap-2"
        >
          <div className="relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type @X followed by your query"
              className="w-full bg-gray-700/40 border border-gray-600/30 text-gray-200 placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all py-3 px-4 pr-[280px] resize-none min-h-[80px] max-h-[200px] overflow-y-auto"
              style={{ height: 'auto' }}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={toggleFileSelector}
                  className="flex items-center gap-1 px-2 py-1.5 bg-gray-700/40 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-colors text-xs border border-gray-600/30"
                >
                  <span className="text-gray-400">#</span>Content
                </button>

                {showFileSelector && (
                  <div
                    ref={fileSelectorRef}
                    className="absolute bottom-full left-0 mb-1 w-64 bg-[#1c2128] border border-[#30363d] rounded-lg shadow-lg overflow-hidden z-10 max-h-[300px] overflow-y-auto"
                  >
                    <div className="p-2">
                      <div className="text-xs font-medium text-[#7d8590] px-2 py-1">Select a file to include</div>
                      {files.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-[#7d8590]">No files available</div>
                      ) : (
                        files.map(file => (
                          <button
                            key={file.id}
                            onClick={() => handleFileSelect(file)}
                            className="w-full text-left px-2 py-1.5 text-sm rounded flex items-center space-x-2 hover:bg-[#21262d] text-[#e6edf3]"
                          >
                            <FileText size={14} />
                            <span className="truncate">{file.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 bg-gray-700/40 rounded-lg border border-gray-600/30 pl-2">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-transparent text-gray-200 text-xs py-1.5 pr-1 focus:outline-none focus:ring-0 border-0"
                >
                  <option value="Gemini">Gemini</option>
                  <option value="DeepSeek-Reasoner">DeepSeek-Reasoner</option>
                  <option value="Qwen">Qwen 2.5</option>
                  <option value="QwQ">QwQ 32B</option>
                </select>
              </div>
              <Button 
                type="submit" 
                disabled={isAIProcessing}
                className="bg-indigo-600/80 hover:bg-indigo-500/90 text-gray-100 rounded-xl px-3 py-1.5 flex items-center gap-1 transition-all duration-200 hover:scale-[1.02] group"
              >
                <PaperAirplaneIcon className="h-4 w-4 text-indigo-100 group-hover:translate-x-0.5 transition-transform" />
                <span>Send</span>
              </Button>
            </div>
          </div>
          {/* File input is now handled through the file selector dropdown */}
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-1 px-3 py-1.5 bg-gray-700/40 rounded-xl text-sm border border-gray-600/30">
              <span className="text-gray-300">{file.name}</span>
              <button
                type="button"
                onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                className="text-gray-400 hover:text-gray-200 ml-2"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </form>
      </div>
    </div>
  );
}


export default Chatroom;