"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db, auth } from "@/config/firebase";
import Chat from "@/components/Chat";
import Editor from "@/components/Editor";
import SearchBar from "@/components/Searchbar";
import { MessageCircle, PanelLeftOpen, LayoutDashboard, Search, Home, User, FileSearch, Settings, Code } from "lucide-react";
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

    return (
        <div className="flex flex-col h-screen bg-gray-950 text-white min-w-[1024px] relative">
            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Side Panel with Buttons */}
                <div className="absolute top-0 left-0 z-20 h-full bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 px-2 space-y-6">
                    {/* File Panel Toggle */}
                    <button
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                        onClick={() => setIsNavOpen(!isNavOpen)}
                    >
                        <PanelLeftOpen
                            size={24}
                            className="h-6 w-6 text-gray-300 hover:text-white transition-colors"
                        />
                    </button>
                    
                    {/* AI Chat Button */}
                    <button
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                        onClick={() => setIsChatOpen(!isChatOpen)}
                    >
                        <MessageCircle
                            size={24}
                            className="h-6 w-6 text-gray-300 hover:text-white transition-colors"
                        />
                    </button>
                    
                    {/* Search Files Button */}
                    <button
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <FileSearch
                            size={24}
                            className="h-6 w-6 text-gray-300 hover:text-white transition-colors"
                        />
                    </button>
                    
                    {/* Code Button */}
                    <button
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <Code
                            size={24}
                            className="h-6 w-6 text-gray-300 hover:text-white transition-colors"
                        />
                    </button>
                    
                    {/* Settings Button */}
                    <button
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <Settings
                            size={24}
                            className="h-6 w-6 text-gray-300 hover:text-white transition-colors"
                        />
                    </button>
                </div>

                {/* Left Side - File & Folder Panel */}
                <nav
                    className={`transition-all duration-300 ml-10 ${
                        isNavOpen ? "w-[20%]" : "w-0"
                    } overflow-hidden bg-gray-900 border-r border-gray-800 flex flex-col h-full`}
                >
                    {isNavOpen && (
                        <NavPanel workspaceId={workspaceId} openFile={setSelectedFile} />
                    )}
                </nav>

                {/* Main - Editor Content */}
                <main className="flex-1 h-full flex flex-col overflow-auto">
                    {/* New Navigation Bar */}
                    <div className="flex h-[6%] items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
                        <div className="flex items-center gap-4">
                            <span className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Xen.ai</span>
                            <h1 className="text-lg font-mono">
                                Workspace: <span className="text-indigo-400">{workspaceName}</span>
                            </h1>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            {/* Dashboard Button */}
                            <button
                                onClick={goToDashboard}
                                className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-500 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:shadow-blue-500/50"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </button>
                            
                            {/* Home Button */}
                            <Link href="/">
                                <button className="flex items-center gap-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors">
                                    <Home className="w-4 h-4" />
                                    Home
                                </button>
                            </Link>
                            
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
                className={`fixed bottom-0 right-0 transition-all duration-300 shadow-lg ${
                    isChatOpen ? "h-[82%]" : "h-0"
                } overflow-hidden w-[45%]`}
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
