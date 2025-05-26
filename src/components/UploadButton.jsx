import React, { useState, useRef } from 'react';
import { Upload, File, Folder, X, CheckCircle, AlertCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';

const UploadButton = ({ workspaceId, onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Function to read file content as text
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // Function to upload a single file to Firestore
  const uploadFileToFirestore = async (file, folderId = null) => {
    try {
      const content = await readFileContent(file);
      const filesRef = collection(db, `workspaces/${workspaceId}/files`);
      
      const fileData = {
        name: file.name,
        content: content,
        folderId: folderId,
        createdAt: serverTimestamp(),
        lastModified: new Date().toISOString(),
        uploadedBy: auth.currentUser?.uid,
        size: file.size,
        type: file.type || 'text/plain'
      };

      await addDoc(filesRef, fileData);
      return { success: true, fileName: file.name };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { success: false, fileName: file.name, error: error.message };
    }
  };

  // Function to create a folder in Firestore
  const createFolderInFirestore = async (folderName, parentFolderId = null) => {
    try {
      const foldersRef = collection(db, `workspaces/${workspaceId}/folders`);
      
      const folderData = {
        name: folderName,
        parentFolderId: parentFolderId,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid
      };

      const docRef = await addDoc(foldersRef, folderData);
      return { success: true, folderId: docRef.id, folderName };
    } catch (error) {
      console.error('Error creating folder:', error);
      return { success: false, folderName, error: error.message };
    }
  };

  // Function to handle file uploads
  const handleFileUpload = async (files) => {
    setIsUploading(true);
    setUploadProgress([]);
    
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(prev => [...prev, { name: file.name, status: 'uploading' }]);
      
      const result = await uploadFileToFirestore(file);
      
      setUploadProgress(prev => 
        prev.map(item => 
          item.name === file.name 
            ? { ...item, status: result.success ? 'success' : 'error', error: result.error }
            : item
        )
      );
      
      results.push(result);
    }
    
    setIsUploading(false);
    
    // Call the callback to refresh the file list
    if (onUploadComplete && results.length > 0 && results[0].success) {
      onUploadComplete({ name: results[0].fileName });
    }
    
    // Auto-close modal after 3 seconds if all uploads were successful
    const allSuccessful = results.every(r => r.success);
    if (allSuccessful) {
      setTimeout(() => {
        setShowModal(false);
        setUploadProgress([]);
      }, 3000);
    }
  };

  // Function to handle folder uploads (with file structure)
  const handleFolderUpload = async (files) => {
    setIsUploading(true);
    setUploadProgress([]);
    
    const folderMap = new Map(); // To track created folders
    const results = [];
    
    // Sort files to ensure folders are created before their contents
    const sortedFiles = Array.from(files).sort((a, b) => {
      const aDepth = a.webkitRelativePath.split('/').length;
      const bDepth = b.webkitRelativePath.split('/').length;
      return aDepth - bDepth;
    });
    
    for (const file of sortedFiles) {
      const pathParts = file.webkitRelativePath.split('/');
      const fileName = pathParts.pop();
      
      let currentFolderId = null;
      let currentPath = '';
      
      // Create folder structure
      for (const folderName of pathParts) {
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        
        if (!folderMap.has(currentPath)) {
          setUploadProgress(prev => [...prev, { name: `📁 ${currentPath}`, status: 'uploading' }]);
          
          const folderResult = await createFolderInFirestore(folderName, currentFolderId);
          
          if (folderResult.success) {
            folderMap.set(currentPath, folderResult.folderId);
            currentFolderId = folderResult.folderId;
            
            setUploadProgress(prev => 
              prev.map(item => 
                item.name === `📁 ${currentPath}` 
                  ? { ...item, status: 'success' }
                  : item
              )
            );
          } else {
            setUploadProgress(prev => 
              prev.map(item => 
                item.name === `📁 ${currentPath}` 
                  ? { ...item, status: 'error', error: folderResult.error }
                  : item
              )
            );
            break;
          }
        } else {
          currentFolderId = folderMap.get(currentPath);
        }
      }
      
      // Upload the file
      if (currentFolderId !== undefined) {
        setUploadProgress(prev => [...prev, { name: file.webkitRelativePath, status: 'uploading' }]);
        
        const result = await uploadFileToFirestore(file, currentFolderId);
        
        setUploadProgress(prev => 
          prev.map(item => 
            item.name === file.webkitRelativePath 
              ? { ...item, status: result.success ? 'success' : 'error', error: result.error }
              : item
          )
        );
        
        results.push(result);
      }
    }
    
    setIsUploading(false);
    
    // Call the callback to refresh the file list
    if (onUploadComplete && results.length > 0 && results[0].success) {
      onUploadComplete({ name: results[0].fileName });
    }
    
    // Auto-close modal after 3 seconds if all uploads were successful
    const allSuccessful = results.every(r => r.success);
    if (allSuccessful) {
      setTimeout(() => {
        setShowModal(false);
        setUploadProgress([]);
      }, 3000);
    }
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setShowModal(true);
      handleFileUpload(files);
    }
  };

  const handleFolderInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      setShowModal(true);
      handleFolderUpload(files);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Upload Button */}
      <div className="flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-lg transition-all"
          title="Upload Files"
          disabled={isUploading}
        >
          <Upload size={16} className="text-white" />
        </button>
        
        <button
          onClick={() => folderInputRef.current?.click()}
          className="p-1.5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 rounded-lg transition-all"
          title="Upload Folder"
          disabled={isUploading}
        >
          <Folder size={16} className="text-white" />
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        accept=".txt,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.cs,.go,.html,.css,.json,.md,.xml,.yaml,.yml"
      />
      
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        onChange={handleFolderInputChange}
        className="hidden"
      />

      {/* Upload Progress Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Upload Progress</h3>
              {!isUploading && (
                <button
                  onClick={() => {
                    setShowModal(false);
                    setUploadProgress([]);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {uploadProgress.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <div className="flex items-center gap-2 flex-1">
                    {item.name.startsWith('📁') ? (
                      <Folder size={16} className="text-blue-400 flex-shrink-0" />
                    ) : (
                      <File size={16} className="text-gray-400 flex-shrink-0" />
                    )}
                    <span className="text-sm text-white truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    {item.status === 'error' && item.error && (
                      <span className="text-xs text-red-400" title={item.error}>Error</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {isUploading && (
              <div className="mt-4 text-center">
                <p className="text-gray-300 text-sm">Uploading files...</p>
              </div>
            )}
            
            {!isUploading && uploadProgress.length > 0 && (
              <div className="mt-4 text-center">
                <p className="text-green-400 text-sm">Upload completed!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default UploadButton;