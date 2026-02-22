import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { useChatMessages, useSendMessage } from "../hooks/use-chat";
import { ChatBubble } from "../components/ChatBubble";
import { motion, AnimatePresence } from "framer-motion";

export default function Chat() {
  const [input, setInput] = useState("");
  const { data: messages = [], isLoading } = useChatMessages();
  const sendMessage = useSendMessage();
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessage.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sendMessage.isPending) return;
    sendMessage.mutate(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen w-full relative overflow-hidden">
      {/* Background ambient effect */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Header */}
      <header className="flex-shrink-0 glass-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between z-10">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            Sovern Core <Sparkles className="w-4 h-4 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground">Cooperative Self-Referencing Agent</p>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 z-10 custom-scrollbar">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <BrainCircuit className="w-16 h-16 mb-4 text-primary" />
            <h2 className="text-2xl font-display font-medium mb-2">Initialize Paradigm</h2>
            <p className="max-w-md">Send a message to begin the Congress debate and generate insights.</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full pb-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              
              {/* Optimistic typing indicator */}
              {sendMessage.isPending && (
                <ChatBubble 
                  key="typing-indicator" 
                  message={{
                    id: 0,
                    role: "assistant",
                    content: "",
                    timestamp: new Date(),
                    isTyping: true
                  }} 
                />
              )}
            </AnimatePresence>
            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent z-20">
        <div className="max-w-4xl mx-auto">
          <form 
            onSubmit={handleSubmit}
            className="relative flex items-end gap-2 glass-card rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/50 transition-all"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask Sovern a question or present a scenario..."
              className="flex-1 max-h-40 min-h-[44px] bg-transparent border-0 resize-none py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 text-sm md:text-base custom-scrollbar"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || sendMessage.isPending}
              className="mb-1 mr-1 p-3 rounded-xl bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center mt-2 text-xs text-muted-foreground/60">
            Sovern generates logic entries and extracts structural memory from conversations.
          </div>
        </div>
      </div>
    </div>
  );
}

// Ensure BrainCircuit is imported if used in empty state
import { BrainCircuit } from "lucide-react";
