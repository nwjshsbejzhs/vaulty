import { useState, useEffect } from "react";
import { getRank } from "@/lib/ranks";
import { RankIcon } from "@/components/shared/RankIcon";
import { Username } from "@/components/shared/Username";
import { Crown, Trophy, Medal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

type TimeRange = "24h" | "7d" | "30d" | "all";

interface LeaderboardUser {
  id: string;
  name: string;
  photoURL: string;
  xp: number;
}

export function LeaderboardTab() {
  const [range, setRange] = useState<TimeRange>("all");
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  // In a real app, 'range' would change the query.
  // We use 'xp' field for leaderboard now, not vaultyPoints.
  
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "users"),
          orderBy("xp", "desc"), // Changed from vaultyPoints to xp
          limit(50)
        );
        
        const snapshot = await getDocs(q);
        const fetchedUsers = snapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.displayName || "User",
                    photoURL: data.photoURL || "https://github.com/shadcn.png",
                    xp: data.xp || 0, // Using real XP
                    isGhost: data.isGhost || false 
                };
            })
            .filter(user => !user.isGhost); 
        
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [range]);

  const ranges: { label: string; value: TimeRange }[] = [
    { label: "24h", value: "24h" },
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-center mb-6">
        <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex gap-1">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                range === r.value 
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-cyan-500" size={32} />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
            No users found on leaderboard.
        </div>
      ) : (
        <div className="space-y-3">
            {users.map((user, index) => {
            const rank = getRank(user.xp);
            const isTop3 = index < 3;
            
            return (
                <div 
                key={user.id}
                className={cn(
                    "relative flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.02]",
                    isTop3 
                    ? "bg-gradient-to-r from-white/10 to-transparent border-white/20" 
                    : "bg-white/5 border-white/5"
                )}
                >
                {/* Rank Position */}
                <div className={cn(
                    "w-8 h-8 flex items-center justify-center font-bold text-lg",
                    index === 0 ? "text-yellow-400" :
                    index === 1 ? "text-gray-300" :
                    index === 2 ? "text-amber-600" : "text-gray-500"
                )}>
                    {index === 0 && <Trophy size={20} />}
                    {index === 1 && <Medal size={20} />}
                    {index === 2 && <Medal size={20} />}
                    {index > 2 && `#${index + 1}`}
                </div>

                {/* Avatar & Rank Icon */}
                <div className="relative">
                    <div className={cn(
                    "w-12 h-12 rounded-full overflow-hidden border-2",
                    isTop3 ? "border-cyan-400" : "border-white/10"
                    )}>
                    <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5">
                    <RankIcon rank={rank} size="sm" className="w-5 h-5" />
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <Username name={user.name} xp={user.xp} className="text-base truncate" />
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                    {rank.name} League
                    </p>
                </div>

                {/* XP */}
                <div className="text-right">
                    <div className="font-bold text-cyan-400">{user.xp.toLocaleString()} XP</div>
                </div>
                </div>
            );
            })}
        </div>
      )}
    </div>
  );
}
