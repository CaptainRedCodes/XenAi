import { NextResponse } from "next/server";
const { GoogleGenerativeAI } = require("@google/generative-ai");

export async function POST(request) {
    try {
        const { message} = await request.json();
        if (!message) {
            
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


        const prompt = `you an ai chat bot , who helps people in giving code and solve their probems . your response will directly be shown in the text , so give the response like a chat  and your request is this  ${message}`;

        const result = await model.generateContent(prompt);
        let aiResponse = result.response.text().trim();

        return NextResponse.json({ aiResponse }, { status: 200 });
    } catch (error) {
        console.error("Gemini API Error:", error.response?.data || error.message);
        return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
    }
}