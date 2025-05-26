"use client";
import { useState } from "react";
import { executeCode } from "../api";
import { LANGUAGE_IDS } from "../constants";
import { Play } from "lucide-react";

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
    <div className="w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl flex flex-col h-full overflow-hidden">
      <div className="flex gap-4 p-4 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700">
        <div className="flex-1">
          <textarea
            className="w-full p-3 text-sm bg-gray-800 text-white border border-gray-600 rounded-lg resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-all shadow-inner"
            rows={3}
            placeholder="Enter input (stdin)..."
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          />
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={runCode}
            className="p-2 h-full text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 border border-indigo-500 rounded-lg shadow-lg transition-all transform hover:scale-105 font-medium flex items-center justify-center gap-2"
            disabled={isLoading}
            title="Run Code"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                <span>Compiling...</span>
              </div>
            ) : (
              <>
                <Play size={20} />
                <span className="font-semibold tracking-wide">RUN CODE</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div
        className={`p-4 overflow-auto flex-1 ${isError ? "bg-red-900 bg-opacity-10" : "bg-gray-900"}`}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 border-4 border-t-blue-500 border-r-indigo-500 border-b-purple-500 border-l-teal-500 border-t-transparent rounded-full animate-spin shadow-lg"></div>
              <p className="text-blue-400 animate-pulse">Executing code...</p>
            </div>
          </div>
        ) : output ? (
          <div className={`rounded-lg p-4 ${isError ? "bg-red-900 bg-opacity-20 border border-red-700" : "bg-gray-800 border border-gray-700"}`}>
            {output.map((line, i) => (
              <p key={i} className={`text-sm whitespace-pre-wrap font-mono ${isError ? "text-red-300" : "text-gray-300"}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>{line}</p>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 border border-gray-700 shadow-inner">
              <span className="text-2xl">💻</span>
            </div>
            <p className="text-gray-400">Click "Run Code" to execute your code and see the output here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Output;
