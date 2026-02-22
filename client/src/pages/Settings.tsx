import { useChatStats } from "../hooks/use-chat";
import { Settings as SettingsIcon, BarChart3, MessageSquare, BrainCircuit, Activity } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid } from "recharts";
import { motion } from "framer-motion";

export default function Settings() {
  const { data: stats, isLoading } = useChatStats();

  // Mock historical data for the chart since the API just returns flat totals right now
  // In a real app, this would come from a historical stats endpoint
  const chartData = [
    { name: 'Mon', interactions: Math.floor((stats?.totalMessages || 10) * 0.1) },
    { name: 'Tue', interactions: Math.floor((stats?.totalMessages || 10) * 0.3) },
    { name: 'Wed', interactions: Math.floor((stats?.totalMessages || 10) * 0.2) },
    { name: 'Thu', interactions: Math.floor((stats?.totalMessages || 10) * 0.6) },
    { name: 'Fri', interactions: Math.floor((stats?.totalMessages || 10) * 0.4) },
    { name: 'Sat', interactions: Math.floor((stats?.totalMessages || 10) * 0.8) },
    { name: 'Sun', interactions: stats?.totalMessages || 0 },
  ];

  const statCards = [
    { label: "Total Messages", value: stats?.totalMessages || 0, icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "User Queries", value: stats?.userMessages || 0, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Sovern Responses", value: stats?.sovernMessages || 0, icon: BrainCircuit, color: "text-primary", bg: "bg-primary/10" },
    { label: "Tokens Processed", value: (stats?.totalTokens || 0).toLocaleString(), icon: BarChart3, color: "text-amber-400", bg: "bg-amber-400/10" },
  ];

  return (
    <div className="flex flex-col h-screen w-full overflow-y-auto custom-scrollbar">
      <header className="px-8 py-10">
        <h1 className="text-4xl font-display font-bold text-white mb-2 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-muted-foreground" />
          System Telemetry
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Monitor Sovern's processing metrics and usage statistics.
        </p>
      </header>

      <div className="px-8 pb-12 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={stat.label}
              className="glass-card rounded-2xl p-6 flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-white/10 rounded animate-pulse mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold font-display text-white">{stat.value}</h3>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-6 md:p-8"
        >
          <h3 className="text-xl font-bold font-display text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Interaction Volume
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(20, 20, 25, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: 'white' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="interactions" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorInteractions)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Configurations Placeholder */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 glass-card rounded-2xl p-6 md:p-8"
        >
          <h3 className="text-xl font-bold font-display text-white mb-6 border-b border-white/5 pb-4">
            System Preferences
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Continuous Learning</p>
                <p className="text-sm text-muted-foreground">Allow Sovern to extract insights to Memory.</p>
              </div>
              <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer opacity-80">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Paradigm Transparency</p>
                <p className="text-sm text-muted-foreground">Log debate transcripts to Congress.</p>
              </div>
              <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer opacity-80">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
