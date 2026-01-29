'use client';

import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { loadAllFiles, deleteFile, SavedFile } from '../../lib/storage';

interface FileManagerProps {
  onOpen: (code: string) => void;
  onNew: () => void;
}

export interface FileManagerRef {
  openFileManager: () => void;
}

const FileManager = forwardRef<FileManagerRef, FileManagerProps>(({ onOpen, onNew }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<SavedFile[]>([]);

  const handleOpen = useCallback(() => {
    const savedFiles = loadAllFiles();
    setFiles(savedFiles);
    setIsOpen(true);
  }, []);

  const handleSelectFile = useCallback((file: SavedFile) => {
    onOpen(file.code);
    setIsOpen(false);
  }, [onOpen]);

  const handleDeleteFile = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this file?')) {
      deleteFile(id);
      setFiles(loadAllFiles());
    }
  }, []);

  const handleNew = useCallback(() => {
    onNew();
    setIsOpen(false);
  }, [onNew]);

  const handleImportFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.scad,.csg';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const reader = new FileReader();
          reader.onload = (event) => {
            const code = event.target?.result as string;
            onOpen(code);
            setIsOpen(false);
          };
          reader.onerror = () => {
            alert('Failed to read file');
          };
          reader.readAsText(file);
        } catch (error) {
          console.error('File import error:', error);
          alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    };
    input.click();
  }, [onOpen]);

  // Expose openFileManager function to parent via ref
  useImperativeHandle(ref, () => ({
    openFileManager: handleOpen
  }), [handleOpen]);

  return (
    <>
      {/* File Manager Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-bold text-white mb-4">File Manager</h2>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleNew}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium"
              >
                New File
              </button>
              <button
                onClick={handleImportFile}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors font-medium"
              >
                Import .scad
              </button>
            </div>

            {/* Files List */}
            <div className="max-h-96 overflow-y-auto">
              {files.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No saved files</p>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => handleSelectFile(file)}
                      className="p-3 bg-slate-700 hover:bg-slate-600 rounded cursor-pointer transition-colors flex justify-between items-start group"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{file.name}</h3>
                        <p className="text-xs text-slate-400">
                          {new Date(file.timestamp).toLocaleString()}
                        </p>
                        {file.description && (
                          <p className="text-xs text-slate-300 mt-1 truncate">{file.description}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDeleteFile(file.id, e)}
                        className="ml-2 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 mt-4 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
});

FileManager.displayName = 'FileManager';

export default FileManager;
