"use client";
import { useState } from "react";
import { executeCode } from "../api";
import { LANGUAGE_IDS } from "../constants";

const Output = ({ editorRef, language }) => {
  const [output, setOutput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [stdin, setStdin] = useState("");

  const runCode = async () => {
    const sourceCode = editorRef.current.getValue();
    if (!sourceCode) return;
    setIsLoading(true);

    try {
      const result = await executeCode(LANGUAGE_IDS[language], sourceCode, stdin);

      const out = [
        result.stdout && `Output:\n${result.stdout}`,
        result.stderr && `Runtime Error:\n${result.stderr}`,
        result.compile_output && `Compile Error:\n${result.compile_output}`,
      ].filter(Boolean).join("\n");
      
      setOutput(out.split("\n"));
      setIsError(!!(result.stderr || result.compile_output));
      
    } catch (error) {
      console.error(error);
      setIsError(true);
      setOutput(["Error while running the code"]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ml-8 w-[30%] bg-black ring-1 ring-gray-700 rounded-lg shadow-lg flex flex-col h-full">
      <textarea
        className="w-full p-2 mb-2 text-sm bg-gray-800 text-white border border-gray-600 rounded-md resize-none"
        rows={4}
        placeholder="Enter input (stdin)..."
        value={stdin}
        onChange={(e) => setStdin(e.target.value)}
      />
      
      <button
        onClick={runCode}
        className="w-full py-2 mb-4 text-white bg-indigo-700 hover:bg-indigo-900 ring-1 ring-indigo-500 bg-opacity-30 rounded-md"
        disabled={isLoading}
      >
        {isLoading ? "Compiling..." : "Run Code"}
      </button>

      <div
        className={`p-4 rounded-md overflow-auto flex-1 ${
          isError ? "border-red-500 text-red-500" : "text-white"
        }`}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-16 h-16 border-4 border-t-teal-500 border-transparent rounded-full animate-spin"></div>
          </div>
        ) : output ? (
          output.map((line, i) => (
            <p key={i} className="text-sm whitespace-pre-wrap">{line}</p>
          ))
        ) : (
          <p className="text-gray-400">Click "Run Code" to see the output here</p>
        )}
      </div>
    </div>
  );
};

export default Output;
