import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getRank, getNextRank, RANKS } from "@/lib/ranks";
import { RankIcon } from "@/components/shared/RankIcon";
import { CheckCircle2, Circle, ArrowRight, Lock, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRewards } from "@/hooks/use-rewards";

interface Task {
  id: string;
  title: string;
  xp: number;
  completed: boolean;
  type: "daily" | "weekly" | "milestone";
  action?: () => void;
}

export function RankTab() {
  const { userData } = useAuth();
  const { claimDailyLogin, watchVideo, shareOnTwitter, loading } = useRewards();
  
  // Use XP specifically here
  const xp = userData?.xp || 0;
  const currentRank = getRank(xp);
  const nextRank = getNextRank(currentRank.id);
  const [showRankList, setShowRankList] = useState(false);

  const progress = nextRank 
    ? Math.min(100, Math.max(0, ((xp - currentRank.minXP) / (nextRank.minXP - currentRank.minXP)) * 100))
    : 100;

  const today = new Date().toISOString().split('T')[0];

  const MOCK_TASKS: Task[] = [
    { 
        id: "daily-login", 
        title: "Daily Login", 
        xp: 50, 
        completed: userData?.lastDailyLogin === today, 
        type: "daily",
        action: claimDailyLogin
    },
    { 
        id: "watch-video", 
        title: "Watch Video", 
        xp: 50, 
        completed: (userData?.videosWatchedToday || 0) >= 10, 
        type: "daily",
        action: watchVideo 
    },
    { 
        id: "invite-friend", 
        title: "Invite a friend", 
        xp: 100, 
        completed: false, 
        type: "weekly" 
    },
    { 
        id: "like-posts", 
        title: "Like 5 posts", 
        xp: 10, 
        completed: false, 
        type: "daily" 
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Current Rank Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900 to-black p-8 text-center shadow-2xl">
        {/* Ambient Glow */}
        <div 
          className={cn(
            "absolute inset-0 blur-3xl transition-opacity duration-500",
            currentRank.id === 'master' ? "opacity-60" : "opacity-20"
          )}
          style={{ 
            background: currentRank.id === 'master' 
              ? `conic-gradient(from 0deg at 50% 50%, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8f00ff, #ff0000)`
              : `radial-gradient(circle at center, ${currentRank.color}, transparent 70%)` 
          }}
        />

        {/* Info Button for Rank List */}
        <button 
            onClick={() => setShowRankList(true)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors z-20"
        >
            <Info size={20} />
        </button>

        <div className="relative z-10 flex flex-col items-center">
          <RankIcon rank={currentRank} size="xl" className="w-32 h-32 mb-4" />
          
          <h2 
            className={cn(
              "text-3xl font-black tracking-wider uppercase mb-1",
              currentRank.id === 'master' ? "text-rainbow" : ""
            )}
            style={currentRank.id !== 'master' ? { color: currentRank.color, textShadow: `0 0 20px ${currentRank.color}40` } : undefined}
          >
            {currentRank.name}
          </h2>
          
          <div className="text-gray-400 font-medium mb-6">
            {xp.toLocaleString()} XP
          </div>

          {/* Progress Bar */}
          {nextRank ? (
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                <span>{currentRank.name}</span>
                <span>{nextRank.name}</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="h-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ width: `${progress}%`, backgroundColor: currentRank.color }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
              <div className="text-right text-xs text-gray-400">
                {(nextRank.minXP - xp).toLocaleString()} XP to rank up
              </div>
            </div>
          ) : (
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 font-bold text-lg animate-pulse">
              MAX RANK ACHIEVED
            </div>
          )}
        </div>
      </div>

      {/* Tasks Section */}
      <div>
        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
          <ArrowRight className="text-cyan-400" /> Earn XP
        </h3>
        
        <div className="space-y-3">
          {MOCK_TASKS.map((task) => (
            <div 
              key={task.id}
              onClick={!task.completed && task.action ? task.action : undefined}
              className={cn(
                "flex items-center justify-between p-4 rounded-2xl border transition-all",
                task.completed 
                  ? "bg-green-500/5 border-green-500/20 opacity-60" 
                  : "bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer active:scale-[0.98]"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2 rounded-full",
                  task.completed ? "text-green-400" : "text-gray-500 bg-white/5"
                )}>
                  {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </div>
                <div>
                  <h4 className={cn("font-medium", task.completed && "line-through text-gray-500")}>
                    {task.title}
                  </h4>
                  <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-gray-400 uppercase tracking-wide">
                    {task.type}
                  </span>
                </div>
              </div>
              
              <div className="font-bold text-cyan-400">+{task.xp} XP</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rank List Dialog */}
      <Dialog open={showRankList} onOpenChange={setShowRankList}>
        <DialogContent className="bg-black/95 border border-white/10 text-white max-h-[80vh] overflow-y-auto w-[95%] max-w-md rounded-3xl p-6">
            <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl font-bold text-center">Rank List</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
                {RANKS.map((rank, index) => {
                    const nextRank = RANKS[index + 1];
                    const rangeEnd = nextRank ? nextRank.minXP - 1 : "∞";
                    const isMaster = rank.id === 'master';

                    return (
                        <div 
                            key={rank.id} 
                            className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                        >
                            <div className="w-12 h-12 flex items-center justify-center shrink-0">
                                <RankIcon rank={rank} size="md" className="w-10 h-10" />
                            </div>
                            
                            <div className="flex-1">
                                <h3 
                                    className={cn(
                                        "font-bold text-lg", 
                                        isMaster ? "text-rainbow" : ""
                                    )}
                                    style={!isMaster ? { color: rank.color } : undefined}
                                >
                                    {rank.name}
                                </h3>
                                <div className="text-sm text-gray-400 font-mono">
                                    {rank.minXP.toLocaleString()} - {rangeEnd === "∞" ? rangeEnd : rangeEnd.toLocaleString()} XP
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <button 
                onClick={() => setShowRankList(false)}
                className="mt-6 w-full py-3 rounded-xl bg-white/10 font-bold hover:bg-white/20 transition-colors"
            >
                Close
            </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
