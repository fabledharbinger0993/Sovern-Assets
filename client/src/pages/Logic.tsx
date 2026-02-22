import { useLogicEntries } from "../hooks/use-logic";
import { BrainCircuit, Scale, Clock } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function Logic() {
  const { data: entries = [], isLoading } = useLogicEntries();

  return (
    <div className="flex flex-col h-screen w-full overflow-y-auto custom-scrollbar">
      <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />

      <header className="px-8 py-10">
        <h1 className="text-4xl font-display font-bold text-white mb-2 flex items-center gap-3">
          <BrainCircuit className="w-8 h-8 text-primary" />
          Congress Debate Records
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Transparent view into Congress deliberation, Paradigm routing, and decision weighting.
        </p>
      </header>

      <div className="px-8 pb-12 flex-1">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 glass-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 opacity-60">
            <Scale className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p>No logic entries generated yet. Engage in chat to begin Congress evaluation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {entries.map((entry, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={entry.id}
                className="glass-card rounded-2xl p-6 hover-glow flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold font-display text-white line-clamp-2">
                    {entry.topic}
                  </h3>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium">
                    <Scale className="w-4 h-4" />
                    Weight: {entry.paradigmWeight}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(entry.timestamp), "MMM d, yyyy 'at' h:mm a")}
                </div>

                <div className="flex-1 bg-black/20 rounded-xl p-4 mb-4 overflow-y-auto custom-scrollbar max-h-48 border border-white/5">
                  <p className="text-sm font-mono text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {entry.debateTranscript}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Resolution</div>
                  <p className="text-sm text-white/90">{entry.resolution}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
