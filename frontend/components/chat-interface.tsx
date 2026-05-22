'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { sendChatMessage, type ChatMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onNewMessage: (message: ChatMessage) => void;
}

export function ChatInterface({ messages, onNewMessage }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = useMutation({
    mutationFn: ({
      message,
      history,
    }: {
      message: string;
      history: { role: 'user' | 'assistant'; content: string }[];
    }) => sendChatMessage(message, history),
    onSuccess: (data) => {
      onNewMessage({
        role: 'assistant',
        content: data.answer ?? 'Sorry, I could not generate a response.',
        products: data.products,
        timestamp: new Date(),
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    
    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    onNewMessage(userMessage);
    chatMutation.mutate({ message: input.trim(), history });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Start a conversation
            </h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Upload a document and ask questions about its content. The AI will respond based on the uploaded document.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </p>
                  {message.role === 'assistant' && message.products && message.products.length > 0 && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {message.products.map((product) => (
                        <div
                          key={product.id}
                          className="overflow-hidden rounded-lg border border-border/70 bg-background"
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-32 w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="128" viewBox="0 0 200 128"%3E%3Crect fill="%23e5e7eb" width="200" height="128"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="12"%3ENo image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <div className="p-3">
                            <p className="font-medium text-sm text-foreground">{product.name}</p>
                            <p className="mt-1 text-sm text-primary">${Number(product.price).toFixed(2)}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {product.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className={cn(
                    'mt-1 text-xs',
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            
            {chatMutation.isError && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <Bot className="h-4 w-4 text-destructive" />
                </div>
                <div className="rounded-2xl bg-destructive/10 px-4 py-3">
                  <p className="text-sm text-destructive">
                    {chatMutation.error.message}
                  </p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t bg-card/50 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your document..."
              rows={1}
              className="w-full resize-none rounded-xl border bg-background px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={chatMutation.isPending}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || chatMutation.isPending}
            className="h-12 w-12 shrink-0 rounded-xl"
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
