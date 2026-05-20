'use client';

import { X, File, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/file-upload';
import { ChatHistory, type ChatSession } from '@/components/chat-history';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedFiles: string[];
  onUploadSuccess: (filename: string) => void;
  onRemoveFile: (filename: string) => void;
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
}

export function Sidebar({
  isOpen,
  onClose,
  uploadedFiles,
  onUploadSuccess,
  onRemoveFile,
  chatSessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-80 flex-col border-r bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4 lg:hidden">
          <span className="font-semibold text-sidebar-foreground">Menu</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="border-b p-4">
            <h2 className="mb-3 text-sm font-semibold text-sidebar-foreground">
              Upload Document
            </h2>
            <FileUpload onUploadSuccess={onUploadSuccess} />
            
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Uploaded Files ({uploadedFiles.length})
                </p>
                {uploadedFiles.map((file) => (
                  <div
                    key={file}
                    className="flex items-center gap-2 rounded-lg bg-sidebar-accent p-2"
                  >
                    <File className="h-4 w-4 text-sidebar-primary" />
                    <span className="flex-1 truncate text-xs text-sidebar-foreground">
                      {file}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onRemoveFile(file)}
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Remove file</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1">
            <h2 className="px-4 py-3 text-sm font-semibold text-sidebar-foreground">
              Chat History
            </h2>
            <ChatHistory
              sessions={chatSessions}
              activeSessionId={activeSessionId}
              onSelectSession={onSelectSession}
              onNewChat={onNewChat}
              onDeleteSession={onDeleteSession}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
