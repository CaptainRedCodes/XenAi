"use client";
import { Moon, Sun, Sparkles, Wrench, File, Expand, Shrink, Settings } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import axios from "axios";
import { Box } from "@chakra-ui/react";
import Output from "./Output";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";

// Keep boilerplates in a separate file to improve code organization
const BOILERPLATES = {
  'javascript': "// JavaScript code snippet\nconsole.log('Hello, world!');",
  'python': "# Python code snippet\nprint('Hello, world!')",
  'typescript': "// TypeScript code snippet\nconst message: string = 'Hello, world!';\nconsole.log(message);",
  'java': "// Java code snippet\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello, world!\");\n  }\n}",
  'csharp': "// C# code snippet\nusing System;\n\npublic class Program\n{\n  public static void Main(string[] args)\n  {\n    Console.WriteLine(\"Hello, world!\");\n  }\n}",
  'cpp': "// C++ code snippet\n#include <iostream>\n\nint main() {\n  std::cout << \"Hello, world!\" << std::endl;\n  return 0;\n}",
  'go': "// Go code snippet\npackage main\n\nimport \"fmt\"\n\nfunc main() {\n  fmt.Println(\"Hello, world!\")\n}",
  'html': "<!DOCTYPE html>\n<html>\n<head>\n<title>My First Webpage</title>\n</head>\n<body>\n\n<h1>Hello World!</h1>\n\n<p>This is my first webpage.</p>\n\n</body>\n</html>",
  'markdown': "# Markdown code snippet\n\n## Heading 2\n\nThis is a paragraph.",
  'text': "Plain Text",
};

// Define a direct mapping of file extensions to language identifiers
const EXTENSION_TO_LANGUAGE = {
  js: 'javascript',
  jsx: 'javascriptreact',
  py: 'python',
  ts: 'typescript',
  tsx: 'typescriptreact',
  java: 'java',
  cs: 'csharp',
  cpp: 'cpp',
  c: 'cpp',
  go: 'go',
  html: 'html',
  css: 'css',
  json: 'json',
  md: 'markdown',
};

// Object to store cached file contents
const FILE_CACHE = {};

export default function CodeEditor({ file }) {
  // State management
  const [selectedTheme, setSelectedTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState("");
  const [isFixing, setIsFixing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Refs
  const monaco = useMonaco();
  const timeoutRef = useRef(null);
  const editorRef = useRef();
  const settingsRef = useRef(null);
  const isSavingRef = useRef(false);
  const unsubscribeRef = useRef(null);

  // When the component unmounts, unsubscribe from Firestore
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // When the file changes, update the language and load content
  useEffect(() => {
    if (!file?.name) {
      setCodeLanguage("javascript");
      setCurrentCode("// Select a file to start coding...");
      return;
    }

    // Unsubscribe from previous file listener if any
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Detect language from file extension
    const parts = file.name.split(".");
    if (parts.length > 1) {
      const extension = parts.pop().toLowerCase();
      const detectedLanguage = EXTENSION_TO_LANGUAGE[extension] || extension;
      setCodeLanguage(detectedLanguage);
    } else {
      setCodeLanguage("text");
    }

    // Load file content
    loadFileContent();

  }, [file?.id]); // Only re-run when file ID changes

  // Load file content from either cache or Firestore
  const loadFileContent = useCallback(async () => {
    if (!file?.id || !file?.workspaceId) return;

    try {
      // Check if we have this file in cache first
      if (FILE_CACHE[file.id]) {
        setCurrentCode(FILE_CACHE[file.id]);
      } else {
        // Show loading state or placeholder while fetching
        setCurrentCode("// Loading file content...");
      }

      // Setup the file path
      const filePath = `workspaces/${file.workspaceId}/files`;
      const fileRef = doc(db, filePath, file.id);

      // Get the current document
      const fileSnap = await getDoc(fileRef);

      // Check if file exists and has content
      if (fileSnap.exists()) {
        const fileData = fileSnap.data();

        // If file has content, use it
        if (fileData && fileData.content !== undefined) {
          setCurrentCode(fileData.content);
          FILE_CACHE[file.id] = fileData.content;
        } else {
          // If file exists but has no content, apply boilerplate
          const boilerplate = BOILERPLATES[codeLanguage] || `// No boilerplate available for ${codeLanguage}`;
          setCurrentCode(boilerplate);
          FILE_CACHE[file.id] = boilerplate;

          // Save the boilerplate
          await updateDoc(fileRef, {
            content: boilerplate,
            lastModified: new Date().toISOString()
          });
        }
      } else {
        // If file doesn't exist yet, create it with boilerplate
        const boilerplate = BOILERPLATES[codeLanguage] || `// No boilerplate available for ${codeLanguage}`;
        setCurrentCode(boilerplate);
        FILE_CACHE[file.id] = boilerplate;

        // Create the file with boilerplate
        await setDoc(fileRef, {
          content: boilerplate,
          name: file.name,
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          workspaceId: file.workspaceId
        });
      }

      // Set up realtime listener for this file
      setupFileListener();

    } catch (error) {
      console.error("Error loading file content:", error);
      setCurrentCode("// Error loading file content. Please try again.");
    }
  }, [file, codeLanguage]);

  // Setup Firestore listener for realtime updates
  const setupFileListener = useCallback(() => {
    if (!file?.id || !file?.workspaceId) return;

    const filePath = `workspaces/${file.workspaceId}/files`;
    const fileRef = doc(db, filePath, file.id);

    // Unsubscribe from any existing listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Create new listener
    unsubscribeRef.current = onSnapshot(fileRef, (docSnap) => {
      if (docSnap.exists() && !isSavingRef.current) {
        const data = docSnap.data();
        if (data && data.content !== undefined) {
          // Only update if the content changed and we're not the source of the change
          // This prevents overwriting user's unsaved changes
          if (data.content !== currentCode) {
            FILE_CACHE[file.id] = data.content;
            setCurrentCode(data.content);
          }
        }
      }
    });
  }, [file, currentCode]);

  // Handle editor changes with debounce
  const handleEditorChange = useCallback((value) => {
    // Update local state immediately
    setCurrentCode(value);

    // Update the cache
    if (file?.id) {
      FILE_CACHE[file.id] = value;
    }

    // Debounce saving to Firestore
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveToFirestore(value);
    }, 500);
  }, [file]);

  // Save content to Firestore
  const saveToFirestore = useCallback(async (content) => {
    if (!file?.id || !file?.workspaceId || !isEditorReady) return;

    try {
      isSavingRef.current = true;

      const filePath = `workspaces/${file.workspaceId}/files`;
      const fileRef = doc(db, filePath, file.id);

      await updateDoc(fileRef, {
        content,
        lastModified: new Date().toISOString()
      });

      // Ensure the cache is updated
      FILE_CACHE[file.id] = content;

      // Reset saving flag after a delay
      setTimeout(() => {
        isSavingRef.current = false;
      }, 200);
    } catch (error) {
      console.error("Error saving file:", error);
      isSavingRef.current = false;
    }
  }, [file, isEditorReady]);

  // Editor mount handler
  const onMount = useCallback((editor) => {
    editorRef.current = editor;
    setIsEditorReady(true);
    editor.focus();
  }, []);

  // Generate documentation
  const generateDocs = async () => {
    if (!isEditorReady) return;

    setIsLoading(true);
    try {
      const res = await axios.post("/api/generate-documentation", {
        code: currentCode,
        language: codeLanguage
      });

      const documentation = res.data.documentation;
      const newCode = `${currentCode}\n\n${documentation}`;

      setCurrentCode(newCode);
      FILE_CACHE[file.id] = newCode;

      // Save to Firestore
      saveToFirestore(newCode);
    } catch (error) {
      console.error("Failed to generate documentation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fix syntax errors
  const fixSyntaxErrors = async () => {
    if (!isEditorReady) return;

    setIsFixing(true);
    try {
      const res = await axios.post("/api/get-errors", {
        code: currentCode,
        codeLanguage
      });

      if (res.data.fixedCode) {
        const fixedCode = res.data.fixedCode;
        setCurrentCode(fixedCode);
        FILE_CACHE[file.id] = fixedCode;

        // Save to Firestore
        saveToFirestore(fixedCode);
      }
    } catch (error) {
      console.error("Failed to fix syntax:", error);
    } finally {
      setIsFixing(false);
    }
  };

  // Toggle expanded mode
  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
    // Reflow the editor layout after state update
    setTimeout(() => editorRef.current?.layout(), 100);
  }, []);

  // Close settings panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Available themes
  const themes = [
    { name: "Dark", value: "vs-dark" },
    { name: "Light", value: "light" },
    { name: "High Contrast", value: "hc-black" },
  ];

  return (
    <div className={`bg-gray-900 m-2 h-[94%] rounded-xl p-3 ${isExpanded ? "fixed inset-0 z-50 m-0" : "relative"}`}>
      <Box className="relative h-full">
        <div className="flex h-full">
          <Box w={isExpanded ? "100%" : "78%"} transition="all 0.3s ease" className="h-[100%]">
            <div className="flex justify-between items-center h-[10%] pr-12">
              {file && (
                <div className="flex items-center bg-gray-900 text-white px-4 max-h-[50px] rounded-md shadow-md border border-gray-700 w-40">
                  <File size={16} className="mr-2 text-green-400" />
                  <span className="text-sm text-gray-300 line-clamp-1">{file.name}</span>
                </div>
              )}
              <div className="flex gap-3 items-center">
                <button
                  onClick={toggleExpand}
                  className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all"
                >
                  {isExpanded ? <Shrink size={18} /> : <Expand size={18} />}
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg transition-all"
                >
                  <Settings size={18} />
                </button>
                <button
                  onClick={fixSyntaxErrors}
                  disabled={isFixing}
                  className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg transition-all"
                >
                  {isFixing ? (
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  ) : (
                    <Wrench size={18} />
                  )}
                </button>
                <button
                  onClick={generateDocs}
                  disabled={isLoading}
                  className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg transition-all"
                >
                  {isLoading ?(
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  ):(
                    <Sparkles size={18} />
                    )}
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div
                ref={settingsRef}
                className="absolute top-16 right-10 bg-gray-800 p-4 rounded-md shadow-xl border border-gray-700 z-10"
              >
                <h3 className="text-gray-300 mb-2">Settings</h3>
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="text-gray-400 text-sm">Theme</label>
                    <div className="flex gap-2 mt-1">
                      {themes.map((theme) => (
                        <button
                          key={theme.value}
                          onClick={() => setSelectedTheme(theme.value)}
                          className={`px-2 py-1 rounded-md text-xs ${selectedTheme === theme.value
                              ? "bg-blue-600 text-white"
                              : "bg-gray-700 text-gray-300"
                            }`}
                        >
                          {theme.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Font Size</label>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => setFontSize((prev) => Math.max(10, prev - 1))}
                        className="px-2 py-1 rounded-md bg-gray-700 text-gray-300"
                      >
                        -
                      </button>
                      <span className="text-gray-300">{fontSize}px</span>
                      <button
                        onClick={() => setFontSize((prev) => Math.min(24, prev + 1))}
                        className="px-2 py-1 rounded-md bg-gray-700 text-gray-300"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Editor
              height={isExpanded ? "calc(100vh - 100px)" : "92%"}
              theme={selectedTheme}
              language={codeLanguage}
              value={currentCode}
              onMount={onMount}
              onChange={handleEditorChange}
              options={{
                fontSize: fontSize,
                wordWrap: "on",
                minimap: { enabled: false },
                bracketPairColorization: true,
                suggest: { preview: true },
                inlineSuggest: {
                  enabled: true,
                  showToolbar: "onHover",
                  mode: "subword",
                  suppressSuggestions: false,
                },
                quickSuggestions: { other: true, comments: true, strings: true },
                suggestSelection: "recentlyUsed",
                autoClosingBrackets: "always",
                autoClosingQuotes: "always",
                formatOnPaste: true,
                formatOnType: true,
                scrollBeyondLastLine: false,
              }}
            />
          </Box>
          {!isExpanded && <Output editorRef={editorRef} language={codeLanguage} />}
        </div>
      </Box>
    </div>
  );
}