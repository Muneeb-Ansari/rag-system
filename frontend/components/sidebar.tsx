'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatHistory, type ChatSession } from '@/components/chat-history';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
}

export function Sidebar({
  isOpen,
  onClose,
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
            <Button asChild variant="secondary" className="w-full">
              <Link href="/upload">Go to upload page</Link>
            </Button>
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
