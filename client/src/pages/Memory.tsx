import { useMemoryEntries } from "../hooks/use-memory";
import { Database, Zap, Hash } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function Memory() {
  const { data: entries = [], isLoading } = useMemoryEntries();

  // Helper to safely parse JSON arrays if they come back as strings or arrays
  const parseJsonArray = (data: unknown): string[] => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return []; }
    }
    return [];
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-y-auto custom-scrollbar">
      <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <header className="px-8 py-10">
        <h1 className="text-4xl font-display font-bold text-white mb-2 flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-400" />
          Ego Memory
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Human/self insights, learned patterns, and belief-aligned memory extracted from interactions.
        </p>
      </header>

      <div className="px-8 pb-12 flex-1">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 glass-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 opacity-60">
            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p>No structural memories formed yet. Continued interaction required.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entries.map((entry, idx) => {
              const tags = parseJsonArray(entry.tags);
              const evidence = parseJsonArray(entry.supportingEvidence);
              
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  key={entry.id}
                  className="glass-card rounded-2xl p-6 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] hover:border-blue-500/30 transition-all flex flex-col h-full relative overflow-hidden"
                >
                  {/* Confidence Bar Top */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-primary"
                      style={{ width: `${entry.confidenceScore}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-start mb-4 mt-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      {format(new Date(entry.timestamp), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md">
                      <Zap className="w-3 h-3" />
                      {entry.confidenceScore}% Conf
                    </div>
                  </div>

                  <h3 className="text-lg font-bold font-display text-white/90 mb-4 leading-snug">
                    "{entry.coreInsight}"
                  </h3>

                  {evidence.length > 0 && (
                    <div className="mb-6 flex-1">
                      <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Evidence</div>
                      <ul className="space-y-2">
                        {evidence.slice(0, 2).map((ev, i) => (
                          <li key={i} className="text-sm text-muted-foreground/80 flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span className="line-clamp-2">{ev}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t border-white/5 flex flex-wrap gap-2">
                    {tags.map((tag, i) => (
                      <span key={i} className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/5 text-white/70 border border-white/10">
                        <Hash className="w-3 h-3 opacity-50" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
