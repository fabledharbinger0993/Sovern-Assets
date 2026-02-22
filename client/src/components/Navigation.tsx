import { Link, useLocation } from "wouter";
import { MessageSquare, BrainCircuit, Database, Settings } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { path: "/", label: "Chat", icon: MessageSquare },
  { path: "/logic", label: "Congress", icon: BrainCircuit },
  { path: "/memory", label: "Ego Memory", icon: Database },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="h-full w-20 md:w-64 glass-panel flex flex-col items-center md:items-start py-8 z-50 sticky top-0">
      <div className="mb-12 px-0 md:px-6 w-full flex justify-center md:justify-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/20">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-bold text-2xl hidden md:block text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
            Sovern
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full px-3 md:px-4">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path} className="relative group">
              <div
                className={`
                  flex items-center gap-4 px-3 md:px-4 py-3 rounded-xl transition-all duration-300
                  ${isActive ? 'text-white' : 'text-muted-foreground hover:text-white hover:bg-white/5'}
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-primary' : ''}`} />
                <span className="font-medium hidden md:block relative z-10">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
