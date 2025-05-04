"use client";

import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "@/config/firebase";
import {
  Folder,
  File,
  PlusCircle,
  Trash,
  ChevronDown,
  ChevronRight,
  Code,
  Image,
  FileText,
  FileCog,
  FileJson,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  FileArchive,
} from "lucide-react";
import { BOILERPLATES } from "@/constants";
import { useRouter } from "next/navigation";

const NavPanel = ({ workspaceId, openFile }) => {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [folderStates, setFolderStates] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [creatingType, setCreatingType] = useState(null);
  const [creatingParentFolderId, setCreatingParentFolderId] = useState(null);
  const [newItemName, setNewItemName] = useState("");
  const [renamingItem, setRenamingItem] = useState(null);
  const router = useRouter();

  const truncateName = (name) => {
    return name.length > 20 ? `${name.substring(0, 20)}...` : name;
  };

  // Get file extension from name
  const getFileExtension = (fileName) => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  };

  // Get file icon based on extension
  const getFileIcon = (fileName) => {
    const ext = getFileExtension(fileName);
    
    // Programming languages
    const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rb', 'php', 'html', 'css', 'scss'];
    // Config files
    const configExts = ['json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'env', 'gitignore', 'dockerignore'];
    // Document files
    const docExts = ['md', 'txt', 'doc', 'docx', 'pdf', 'rtf'];
    // Spreadsheet files
    const spreadExts = ['csv', 'xls', 'xlsx', 'ods'];
    // Media files
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'];
    const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'flac'];
    // Archive files
    const archiveExts = ['zip', 'rar', 'tar', 'gz', '7z'];

    if (codeExts.includes(ext)) {
      return <Code size={16} className="mr-2 text-green-400" />;
    } else if (configExts.includes(ext)) {
      return <FileCog size={16} className="mr-2 text-purple-400" />;
    } else if (ext === 'json') {
      return <FileJson size={16} className="mr-2 text-yellow-400" />;
    } else if (docExts.includes(ext)) {
      return <FileText size={16} className="mr-2 text-blue-400" />;
    } else if (spreadExts.includes(ext)) {
      return <FileSpreadsheet size={16} className="mr-2 text-green-500" />;
    } else if (imageExts.includes(ext)) {
      return <Image size={16} className="mr-2 text-pink-400" />;
    } else if (videoExts.includes(ext)) {
      return <FileVideo size={16} className="mr-2 text-red-400" />;
    } else if (audioExts.includes(ext)) {
      return <FileAudio size={16} className="mr-2 text-indigo-400" />;
    } else if (archiveExts.includes(ext)) {
      return <FileArchive size={16} className="mr-2 text-amber-400" />;
    } else {
      return <File size={16} className="mr-2 text-orange-400" />;
    }
  };

  // Get color for file based on extension
  const getFileColor = (fileName) => {
    const ext = getFileExtension(fileName);
    
    // Color mapping based on file type
    const colorMap = {
      'js': 'text-yellow-300',
      'jsx': 'text-blue-300',
      'ts': 'text-blue-400',
      'tsx': 'text-cyan-300',
      'py': 'text-green-300',
      'html': 'text-orange-300',
      'css': 'text-blue-300',
      'scss': 'text-pink-300',
      'json': 'text-yellow-300',
      'md': 'text-gray-300',
      'txt': 'text-white',
    };

    return colorMap[ext] || 'text-gray-300';
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/login");
      return;
    }

    const membersRef = collection(db, `workspaces/${workspaceId}/members`);
    const unsubscribeMembers = onSnapshot(membersRef, (snapshot) => {
      const membersData = snapshot.docs.map((doc) => doc.data());
      const member = membersData.find((m) => m.userId === user.uid);
      if (member) setUserRole(member.role);
    });

    const foldersRef = collection(db, `workspaces/${workspaceId}/folders`);
    const unsubscribeFolders = onSnapshot(foldersRef, (snapshot) => {
      const foldersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFolders(foldersData);

      const initialFolderStates = {};
      foldersData.forEach((folder) => {
        initialFolderStates[folder.id] = false;
      });
      setFolderStates(initialFolderStates);
    });

    const filesRef = collection(db, `workspaces/${workspaceId}/files`);
    const unsubscribeFiles = onSnapshot(filesRef, (snapshot) => {
      setFiles(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeMembers();
      unsubscribeFolders();
      unsubscribeFiles();
    };
  }, [workspaceId, router]);

  const toggleFolder = (folderId) => {
    setFolderStates((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleDragStart = (e, item, type) => {
    e.stopPropagation();
    setDraggedItem({ id: item.id, type });
  };

  const handleDragOver = (e, targetFolderId) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || draggedItem.id === targetFolderId) return;

    try {
      const isFolder = draggedItem.type === "folder";
      const collectionName = isFolder ? "folders" : "files";
      const fieldName = isFolder ? "parentFolderId" : "folderId";

      await updateDoc(
        doc(db, `workspaces/${workspaceId}/${collectionName}/${draggedItem.id}`),
        { [fieldName]: targetFolderId || null }
      );
    } catch (error) {
      console.error("Error moving item:", error);
    }
    setDraggedItem(null);
  };

  const createItem = async (folderid) => {
    if (!newItemName) return;

    try {
      if (creatingType === "folder") {
        await addDoc(collection(db, `workspaces/${workspaceId}/folders`), {
          name: newItemName,
          parentFolderId: creatingParentFolderId,
        });
      } else {
        // Add default extension if none provided
        let fileName = newItemName;
        if (!fileName.includes('.')) {
          fileName = `${fileName}.txt`;
        }
        
        await addDoc(collection(db, `workspaces/${workspaceId}/files`), {
          name: fileName,
          folderId: creatingParentFolderId,
          workspaceId,
          fileType: getFileExtension(fileName),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          content: generateBoilerplate(fileName)
        });
      }
      setNewItemName("");
      setCreatingType(null);
      setCreatingParentFolderId(null);
      if (folderid) setFolderStates({ ...folderStates, [folderid]: true });

    } catch (error) {
      console.error("Error creating item:", error);
    }
  };

  // Use the imported boilerplate templates

  // Generate boilerplate code based on file extension
  const generateBoilerplate = (fileName) => {
    const ext = getFileExtension(fileName);
    
    // Map file extensions to boilerplate keys
    const extensionToKey = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'cpp': 'cpp',
      'go': 'go',
      'html': 'html',
      'md': 'markdown',
      'txt': 'text'
    };
    
    // Get the appropriate key for the boilerplate
    const boilerplateKey = extensionToKey[ext] || ext;
    
    // Custom boilerplates for some file types not in the imported BOILERPLATES
    const customBoilerplates = {
      'css': `/* 
 * Main Stylesheet
 * Created: ${new Date().toLocaleDateString()}
 */

body {
  margin: 0;
  padding: 0;
  font-family: sans-serif;
}
`,
      'json': `{
  "name": "${fileName.replace('.json', '')}",
  "version": "1.0.0",
  "description": ""
}
`
    };
    
    // Return the boilerplate from the imported BOILERPLATES if available, otherwise from custom ones
    return BOILERPLATES[boilerplateKey] || customBoilerplates[ext] || '';
  };

  const renameItem = async () => {
    if (!renamingItem?.name) return;

    try {
      const collectionName = renamingItem.type === "folder" ? "folders" : "files";
      await updateDoc(
        doc(db, `workspaces/${workspaceId}/${collectionName}/${renamingItem.id}`),
        { 
          name: renamingItem.name,
          ...(renamingItem.type === "file" && {
            fileType: getFileExtension(renamingItem.name),
            updatedAt: new Date().toISOString()
          })
        }
      );
      setRenamingItem(null);
    } catch (error) {
      console.error("Error renaming item:", error);
    }
  };

  const deleteItem = async (type, id) => {
    if (type === "folders") {
      await deleteDoc(doc(db, `workspaces/${workspaceId}/folders/${id}`));
      const nestedFolders = folders.filter(
        (folder) => folder.parentFolderId === id
      );
      for (const nestedFolder of nestedFolders) {
        await deleteItem("folders", nestedFolder.id);
      }
      const folderFiles = files.filter((file) => file.folderId === id);
      for (const file of folderFiles) {
        await deleteDoc(doc(db, `workspaces/${workspaceId}/files/${file.id}`));
      }
    } else {
      await deleteDoc(doc(db, `workspaces/${workspaceId}/files/${id}`));
    }
  };

  const renderFolder = (folder) => {
    const nestedFolders = folders.filter((f) => f.parentFolderId === folder.id);
    const folderFiles = files.filter((file) => file.folderId === folder.id);

    return (
      <div
        key={folder.id}
        className="ml-3 border-l border-gray-700"
        draggable
        onDragStart={(e) => handleDragStart(e, folder, "folder")}
        onDragOver={(e) => handleDragOver(e, folder.id)}
        onDrop={(e) => handleDrop(e, folder.id)}
      >
        <div className="flex items-center justify-between group hover:bg-gray-800 px-1 py-2 rounded transition-colors">
          <div
            className="flex items-center flex-1 cursor-pointer"
            onClick={() => toggleFolder(folder.id)}
          >
            {folderStates[folder.id] ? (
              <ChevronDown size={16} className="mr-1" />
            ) : (
              <ChevronRight size={16} className="mr-1" />
            )}
            <Folder size={16} className="mr-2 text-blue-400" />
            {renamingItem?.id === folder.id ? (
              <input
                className="text-sm bg-gray-800 text-white px-2 py-1 rounded"
                value={renamingItem.name}
                onChange={(e) => setRenamingItem({ ...renamingItem, name: e.target.value })}
                onBlur={renameItem}
                onKeyPress={(e) => e.key === "Enter" && renameItem()}
                autoFocus
              />
            ) : (
              <span
                className="text-sm"
                onDoubleClick={() => setRenamingItem({ id: folder.id, name: folder.name, type: "folder" })}
              >
                {truncateName(folder.name)}
              </span>
            )}
          </div>

          {(userRole === "contributor" || userRole === "owner") && (
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100">
              <Folder
                size={14}
                className="text-blue-400 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setCreatingType((prev) => (prev === "folder" ? null : "folder"));
                  setCreatingParentFolderId(folder.id);
                  setNewItemName("");
                  setFolderStates({ ...folderStates, [folder.id]: true });
                }}
              />
              <File
                size={14}
                className="text-orange-400 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setCreatingType((prev) => (prev === "file" ? null : "file"));
                  setCreatingParentFolderId(folder.id);
                  setNewItemName("");
                  setFolderStates({ ...folderStates, [folder.id]: true });
                }}
              />
              <Trash
                size={14}
                className="text-gray-400 hover:text-red-400 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItem("folders", folder.id);
                }}
              />
            </div>
          )}
        </div>

        {folderStates[folder.id] && (
          <div className="ml-1">
            {creatingType && creatingParentFolderId === folder.id && (
              <div className="ml-4 flex items-center px-2 py-1">
                <input
                  className="text-sm bg-gray-800 text-white px-2 py-1 rounded flex-1"
                  placeholder={`New ${creatingType} name${creatingType === "file" ? " (with extension)" : ""}`}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onBlur={createItem}
                  onKeyPress={(e) => e.key === "Enter" && createItem(folder.id)}
                  autoFocus
                />
              </div>
            )}
            {nestedFolders.map((nestedFolder) => renderFolder(nestedFolder))}
            {folderFiles.map((file) => (
              <div
                key={file.id}
                className="ml-6 flex items-center justify-between group hover:bg-gray-800 px-2 py-1 rounded transition-colors"
                draggable
                onDragStart={(e) => handleDragStart(e, file, "file")}
                onDragOver={(e) => handleDragOver(e, folder.id)}
                onDrop={(e) => handleDrop(e, folder.id)}
              >
                <div
                  className="flex items-center cursor-pointer flex-1"
                  onClick={() => openFile(file)}
                >
                  {getFileIcon(file.name)}
                  {renamingItem?.id === file.id ? (
                    <input
                      className="text-sm bg-gray-700 text-white px-1 rounded"
                      value={renamingItem.name}
                      onChange={(e) => setRenamingItem({ ...renamingItem, name: e.target.value })}
                      onBlur={renameItem}
                      onKeyPress={(e) => e.key === "Enter" && renameItem()}
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`text-sm ${getFileColor(file.name)}`}
                      onDoubleClick={() => setRenamingItem({ id: file.id, name: file.name, type: "file" })}
                    >
                      {truncateName(file.name)}
                    </span>
                  )}
                </div>
                {(userRole === "contributor" || userRole === "owner") && (
                  <Trash
                    size={14}
                    className="text-gray-400 hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem("files", file.id);
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 text-gray-300 h-full w-full flex flex-col border-r border-gray-700">
      <div className="pt-10 px-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">File Explorer</h2>
          {(userRole === "contributor" || userRole === "owner") && (
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setCreatingParentFolderId(null);
                  setNewItemName("");
                  setCreatingType((prev) => (prev === "file" ? null : "file"));
                }}
                className="p-1 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-lg transition-all"
                title="Create new file"
              >
                <PlusCircle size={16} className="text-white" />
              </button>
              <button
                onClick={() => {
                  setCreatingParentFolderId(null);
                  setNewItemName("");
                  setCreatingType((prev) => (prev === "folder" ? null : "folder"));
                }}
                className="p-1 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 rounded-lg transition-all"
                title="Create new folder"
              >
                <Folder size={16} className="text-white" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto py-1 px-1"
        onDragOver={(e) => handleDragOver(e, null)}
        onDrop={(e) => handleDrop(e, null)}
      >
        {creatingType && !creatingParentFolderId && (
          <div className="flex items-center px-2 py-0.5">
            <input
              className="text-sm bg-gray-800 py-1 text-white px-2 rounded flex-1"
              placeholder={`New ${creatingType} name${creatingType === "file" ? " (with extension)" : ""}`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onBlur={createItem}
              onKeyPress={(e) => e.key === "Enter" && createItem()}
              autoFocus
            />
          </div>
        )}

        {folders
          .filter((folder) => !folder.parentFolderId)
          .map((folder) => renderFolder(folder))}

        {files
          .filter((file) => !file.folderId)
          .map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between group hover:bg-gray-800 px-2 py-1 rounded transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, file, "file")}
              onDragOver={(e) => handleDragOver(e, null)}
              onDrop={(e) => handleDrop(e, null)}
            >
              <div
                className="flex items-center cursor-pointer flex-1 border-l border-gray-700 ml-1 px-2 py-1"
                onClick={() => openFile(file)}
              >
                {getFileIcon(file.name)}
                {renamingItem?.id === file.id ? (
                  <input
                    className="text-sm bg-gray-700 text-white px-1 rounded"
                    value={renamingItem.name}
                    onChange={(e) => setRenamingItem({ ...renamingItem, name: e.target.value })}
                    onBlur={renameItem}
                    onKeyPress={(e) => e.key === "Enter" && renameItem()}
                    autoFocus
                  />
                ) : (
                  <span
                    className={`text-sm ${getFileColor(file.name)}`}
                    onDoubleClick={() => setRenamingItem({ id: file.id, name: file.name, type: "file" })}
                  >
                    {truncateName(file.name)}
                  </span>
                )}
              </div>
              {(userRole === "contributor" || userRole === "owner") && (
                <Trash
                  size={14}
                  className="text-gray-400 hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItem("files", file.id);
                  }}
                />
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default NavPanel;