import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Components
import { Navigation } from "./components/Navigation";

// Pages
import Chat from "./pages/Chat";
import Logic from "./pages/Logic";
import Memory from "./pages/Memory";
import Settings from "./pages/Settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Chat} />
      <Route path="/logic" component={Logic} />
      <Route path="/memory" component={Memory} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/30 text-foreground">
          <Navigation />
          <main className="flex-1 relative bg-background/50">
            {/* Ambient background glow shared across app */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.03] to-transparent pointer-events-none" />
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
