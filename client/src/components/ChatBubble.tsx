import { format } from "date-fns";
import { Check, Copy, User, BrainCircuit, Database } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";

interface ChatBubbleProps {
  message: {
    id: number;
    role: string;
    content: string;
    timestamp: string | Date;
    isTyping?: boolean | null;
    logicEntryId?: number | null;
    memoryEntryId?: number | null;
  };
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedTime = format(new Date(message.timestamp), "h:mm a");

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-6 group`}
    >
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 shadow-md
          ${isUser ? "bg-secondary" : "bg-gradient-to-br from-primary to-primary/60 shadow-primary/20"}`}
        >
          {isUser ? <User className="w-4 h-4 text-white" /> : <BrainCircuit className="w-4 h-4 text-white" />}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1.5 min-w-0`}>
          <div className="flex items-baseline gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground/80">
              {isUser ? "You" : "Sovern"}
            </span>
            <span className="text-[10px] text-muted-foreground/50">{formattedTime}</span>
          </div>

          <div className={`relative px-5 py-3.5 rounded-2xl text-sm md:text-base leading-relaxed break-words
            ${isUser 
              ? "bg-secondary text-secondary-foreground rounded-tr-sm" 
              : "glass-card text-foreground rounded-tl-sm hover-glow"
            }`}
          >
            {message.isTyping ? (
              <div className="flex items-center gap-1.5 h-6 px-1">
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full typing-dot"></div>
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full typing-dot"></div>
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full typing-dot"></div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{message.content}</div>
            )}
            
            {/* Context Links (Logic/Memory) - Only show for Sovern */}
            {!isUser && !message.isTyping && (message.logicEntryId || message.memoryEntryId) && (
              <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                {message.logicEntryId && (
                  <Link href={`/logic?id=${message.logicEntryId}`} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-primary-foreground/70 hover:text-primary transition-colors">
                    <BrainCircuit className="w-3 h-3" />
                    <span>Congress Linked</span>
                  </Link>
                )}
                {message.memoryEntryId && (
                  <Link href={`/memory?id=${message.memoryEntryId}`} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-primary-foreground/70 hover:text-accent transition-colors">
                    <Database className="w-3 h-3" />
                    <span>Insight Extracted</span>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Actions Menu */}
          {!message.isTyping && (
            <div className={`flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? "flex-row-reverse" : "flex-row"}`}>
              <button 
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
                title="Copy message"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
