'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { ChatInterface } from '@/components/chat-interface';
import type { ChatMessage } from '@/lib/api';
import type { ChatSession } from '@/components/chat-history';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function generateTitle(message: string) {
  return message.length > 30 ? message.substring(0, 30) + '...' : message;
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const activeSession = chatSessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  const handleNewMessage = (message: ChatMessage) => {
    setChatSessions((prev) => {
      const currentSessionId = activeSessionIdRef.current;

      if (currentSessionId) {
        return prev.map((session) =>
          session.id === currentSessionId
            ? { ...session, messages: [...session.messages, message] }
            : session
        );
      }

      const newSession: ChatSession = {
        id: generateId(),
        title: message.role === 'user' ? generateTitle(message.content) : 'New Chat',
        messages: [message],
        createdAt: new Date(),
      };

      setActiveSessionId(newSession.id);
      activeSessionIdRef.current = newSession.id;

      return [newSession, ...prev];
    });
  };

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    activeSessionIdRef.current = null;
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    activeSessionIdRef.current = id;
    setSidebarOpen(false);
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    setChatSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      activeSessionIdRef.current = null;
    }
  }, [activeSessionId]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header onToggleSidebar={() => setSidebarOpen(true)} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          chatSessions={chatSessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
        />
        
        <main className="flex-1 overflow-hidden">
          <ChatInterface messages={messages} onNewMessage={handleNewMessage} />
        </main>
      </div>
    </div>
  );
}
