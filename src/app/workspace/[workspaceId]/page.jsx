"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db, auth } from "@/config/firebase";
import Chat from "@/components/Chat";
import Editor from "@/components/Editor";
import SearchBar from "@/components/Searchbar";
import { MessageCircle, PanelLeftOpen, LayoutDashboard, Search, FileSearch, Settings, Code, Terminal, HelpCircle, Shrink, Expand } from "lucide-react";
import ShowMembers from "@/components/Members";
import LiveCursor from "@/components/LiveCursor";
import NavPanel from "@/components/Navpanel";
import { LANGUAGE_VERSIONS } from "@/constants";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin border-t-4 border-blue-500 border-solid rounded-full w-16 h-16 border-b-transparent"></div>
  </div>
);

const Workspace = () => {
    const { workspaceId } = useParams();
    const router = useRouter();
    const [selectedFile, setSelectedFile] = useState(null);
    const [workspaceName, setWorkspaceName] = useState("");
    const [membersCount, setMembersCount] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(true);
    const [currentLanguage, setCurrentLanguage] = useState(null);
    const [loading, setLoading] = useState(true); // Loading state
    const [userName, setUserName] = useState("");
    const [activePanel, setActivePanel] = useState("files"); // Default to files panel
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const fetchWorkspace = async () => {
            if (!workspaceId) return;

            setLoading(true); // Set loading to true when starting to fetch
            const workspaceRef = doc(db, "workspaces", workspaceId);
            const workspaceSnap = await getDoc(workspaceRef);

            if (workspaceSnap.exists()) {
                const workspaceData = workspaceSnap.data();
                setWorkspaceName(workspaceData.name);

                const membersRef = collection(db, `workspaces/${workspaceId}/members`);
                const membersSnap = await getDocs(membersRef);
                setMembersCount(membersSnap.size);
            } else {
                console.error("Workspace not found");
            }
            setLoading(false); // Set loading to false once data is fetched
        };

        fetchWorkspace();
    }, [workspaceId]);

    // Fetch User Info
    useEffect(() => {
        const fetchUserInfo = async () => {
            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    setUserName(userSnap.data().displayName || user.email);
                } else {
                    setUserName(user.displayName);
                }
            }
        };

        fetchUserInfo();
    }, []);

    // Add event listener for NavPanel double-click to minimize
    useEffect(() => {
        const handleToggleNavPanel = (event) => {
            if (event.detail && event.detail.minimize) {
                setIsNavOpen(false);
            }
        };
        
        window.addEventListener('toggleNavPanel', handleToggleNavPanel);
        
        return () => {
            window.removeEventListener('toggleNavPanel', handleToggleNavPanel);
        };
    }, []);

    useEffect(() => {
        console.log("🔄 Parent re-rendered!");
        if (selectedFile && selectedFile.name) {
            const parts = selectedFile.name.split(".");
            if (parts.length > 1) {
                const extension = parts.pop().toLowerCase();
                // Map file extension to language (adjust this based on your LANGUAGE_VERSIONS)
                let language;
                for (const lang in LANGUAGE_VERSIONS) {
                    if (LANGUAGE_VERSIONS[lang] === extension) {
                        language = lang;
                        break;
                    }
                }
                setCurrentLanguage(language);
            } else {
                setCurrentLanguage(null); // No extension
            }
        } else {
            setCurrentLanguage(null); // No selected file
        }
    }, [selectedFile]);

    const handleLanguageSelect = (lang) => {
        setCurrentLanguage(lang);
        // You might want to trigger an action here based on the selected language
        console.log(`Language selected: ${lang}`);
    };

    const goToDashboard = () => {
        router.push("/dashboard");
    };

    // Function to handle panel switching
    const handlePanelChange = (panel) => {
        setActivePanel(panel);
        if (panel === "chat") {
            setIsChatOpen(true);
        } else if (isChatOpen && panel !== "chat") {
            setIsChatOpen(false);
        }
    };

    // Render the active panel content
    const renderPanelContent = () => {
        if (!isNavOpen) return null;
        
        switch (activePanel) {
            case "files":
                return <NavPanel workspaceId={workspaceId} openFile={setSelectedFile} />;
            case "terminal":
                return (
                    <div className="p-4 h-full">
                        <h2 className="text-xl font-semibold mb-4 text-green-400">Terminal</h2>
                        <div className="bg-black rounded-lg p-3 h-[calc(100%-3rem)] overflow-auto font-mono text-sm">
                            <div className="text-green-500 mb-2">$ Connected to workspace terminal</div>
                            <div className="text-gray-300">Type commands to interact with your workspace environment.</div>
                            <div className="mt-4 flex items-center">
                                <span className="text-blue-400 mr-2">$</span>
                                <input 
                                    type="text" 
                                    className="bg-transparent border-none outline-none text-white flex-1"
                                    placeholder="Type your command here..."
                                />
                            </div>
                        </div>
                    </div>
                );
            default:
                return <NavPanel workspaceId={workspaceId} openFile={setSelectedFile} />;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-950 text-white min-w-[1024px] relative">
            {/* Navigation Bar - Now spans the full width including over the left panel */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800 z-30">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <span className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity">Xen.ai</span>
                    </Link>
                </div>
                
                <h1 className="text-lg font-mono absolute left-1/2 transform -translate-x-1/2">
                    Workspace: <span className="text-indigo-400">{workspaceName}</span>
                </h1>
                
                <div className="flex items-center gap-6">
                    {/* Dashboard Button */}
                    <button
                        onClick={goToDashboard}
                        className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-500 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:shadow-blue-500/50"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </button>
                    
                    {/* Search */}
                    <div className="flex items-start bg-blue-800 bg-opacity-40 ring-1 ring-blue-500 px-3 py-1 rounded-md">
                        <SearchBar workspaceId={workspaceId} />
                    </div>
                    
                    {/* Members */}
                    <span className="text-lg text-gray-200 bg-slate-800 px-3 py-1 rounded-full flex items-center justify-center gap-2">
                        <ShowMembers workspaceId={workspaceId} />
                    </span>
                    
                    {/* Profile Avatar */}
                    <Link href="/profile">
                        <Avatar className="w-8 h-8 cursor-pointer border-2 border-gray-500 transition-all duration-300 hover:border-blue-400">
                            <AvatarImage src={auth.currentUser?.photoURL || "/robotic.png"} alt="Profile" />
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                    </Link>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Side Panel with Buttons - Improved design */}
                <div className="absolute top-0 left-0 z-20 h-full bg-gray-900 border-r border-gray-800 flex flex-col items-center py-6 px-2 space-y-8 shadow-lg">
                    {/* File Panel Toggle */}
                    <button
                        className={`p-2 rounded-lg transition-colors ${activePanel === 'files' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300 hover:text-white'}`}
                        onClick={() => {
                            setIsNavOpen(true);
                            handlePanelChange("files");
                        }}
                        onDoubleClick={() => setIsNavOpen(false)}
                        title="File Explorer"
                    >
                        <PanelLeftOpen size={22} />
                    </button>
                    
                    {/* AI Chat Button */}
                    <button
                        className={`p-2 rounded-lg transition-colors ${activePanel === 'chat' ? 'bg-teal-600 text-white' : 'hover:bg-gray-800 text-gray-300 hover:text-white'}`}
                        onClick={() => handlePanelChange("chat")}
                        title="AI Chat"
                    >
                        <MessageCircle size={22} />
                    </button>
                    
                    {/* Search Files Button */}
                    <button
                        className={`p-2 rounded-lg transition-colors ${activePanel === 'search' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800 text-gray-300 hover:text-white'}`}
                        onClick={() => {
                            setIsNavOpen(true);
                            handlePanelChange("files"); // Changed to use the file explorer with search functionality
                        }}
                        title="Search Files"
                    >
                        <FileSearch size={22} />
                    </button>
                    
                    {/* Terminal Button */}
                    <button
                        className={`p-2 rounded-lg transition-colors ${activePanel === 'terminal' ? 'bg-green-600 text-white' : 'hover:bg-gray-800 text-gray-300 hover:text-white'}`}
                        onClick={() => {
                            setIsNavOpen(true);
                            handlePanelChange("terminal");
                        }}
                        title="Terminal"
                    >
                        <Terminal size={22} />
                    </button>
                </div>

                {/* Left Side - Panel Content - Reduced size */}
                <div
                    className={`transition-all duration-300 ml-10 ${isNavOpen ? "w-[20%]" : "w-0"} overflow-hidden bg-gray-900 border-r border-gray-800 flex flex-col h-full`}
                >
                    {renderPanelContent()}
                </div>

                {/* Main - Editor Content */}
                <main className="flex-1 h-full flex flex-col overflow-auto">
                    {/* Editor Content */}
                    <div className="flex-1 overflow-auto">
                        {/* Show loading spinner if workspace is loading */}
                        {loading ? (
                            <LoadingSpinner />
                        ) : (
                            <Editor file={selectedFile} />
                        )}
                    </div>
                </main>
            </div>

            {/* Chat Panel (Overlapping from Bottom) */}
            <aside
                className={`fixed bottom-0 right-0 transition-all duration-300 shadow-lg ${isChatOpen ? "h-[82%]" : "h-0"} overflow-hidden w-[45%]`}
            >
                {isChatOpen && (
                    <Chat workspaceId={workspaceId} isChatOpen={isChatOpen} setIsChatOpen={setIsChatOpen} />
                )}
            </aside>

            {/* Chat Toggle Button (only shown when chat is closed and sidebar button is not used) */}
            {!isChatOpen && (
                <button
                    className="fixed bottom-6 right-10 z-30 py-3 font-mono px-5 flex items-center gap-2 text-xl bg-teal-700/30 ring-1 ring-teal-500 animate-bounce hover:bg-teal-800 text-white rounded-full shadow-lg md:hidden"
                    onClick={() => setIsChatOpen(!isChatOpen)}
                >
                    <MessageCircle className="h-8 w-8" /> AI-Chat
                </button>
            )}
            <LiveCursor workspaceId={workspaceId} />
        </div>
    );
};

export default Workspace;
