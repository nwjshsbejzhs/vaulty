import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Check, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { VaultyIcon } from "@/components/ui/vaulty-icon";

export function DailyGiftSection() {
  const { user, userData } = useAuth();
  const [currentDay, setCurrentDay] = useState(1); 
  const [claimedToday, setClaimedToday] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const dailyRewards = [25, 50, 75, 100, 125, 150, 200];
  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long" });

  useEffect(() => {
    if (userData) {
      // Set current streak day (default to 1)
      const streak = userData.dailyStreak || 1;
      // Cap at 7 days for this UI
      setCurrentDay(streak > 7 ? (streak % 7 === 0 ? 7 : streak % 7) : streak);

      // Check if claimed today
      if (userData.lastDailyGiftClaim) {
        const lastClaimDate = userData.lastDailyGiftClaim.toDate();
        const today = new Date();
        const isSameDay = lastClaimDate.getDate() === today.getDate() && 
                          lastClaimDate.getMonth() === today.getMonth() && 
                          lastClaimDate.getFullYear() === today.getFullYear();
        setClaimedToday(isSameDay);
      } else {
        setClaimedToday(false);
      }
    }
  }, [userData]);

  const handleClaimReward = async () => {
    if (!user || claimedToday || loading) return;
    
    setLoading(true);
    try {
      // Calculate reward based on current day (array is 0-indexed)
      const rewardIndex = (currentDay - 1) % 7;
      const reward = dailyRewards[rewardIndex] || 25;
      
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        vaultyPoints: increment(reward),
        lastDailyGiftClaim: serverTimestamp(),
        dailyStreak: increment(1)
      });
      
      setClaimedToday(true);
      // currentDay will update via the useEffect when userData changes
    } catch (e) {
      console.error("Error claiming reward", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">{currentMonth} Rewards</h3>
          <p className="text-sm text-gray-400">Login daily to build your streak</p>
        </div>
        <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-cyan-500/20 border border-cyan-500/30">
          <Gift className="text-pink-400" size={24} />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {dailyRewards.map((reward, index) => {
          const dayNum = index + 1;
          const isCurrentDay = currentDay === dayNum;
          const isClaimed = dayNum < currentDay || (dayNum === currentDay && claimedToday);
          
          return (
            <div
              key={dayNum}
              className={cn(
                "relative flex flex-col items-center justify-center aspect-[4/5] rounded-xl transition-all duration-300",
                isClaimed
                  ? "bg-gradient-to-b from-blue-500/20 to-blue-900/10 border border-blue-500/30"
                  : isCurrentDay
                    ? "bg-gradient-to-b from-cyan-500 to-blue-600 border border-white/30 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-110 z-10"
                    : "bg-white/5 border border-white/5 opacity-50 grayscale"
              )}
            >
              <span className={cn("text-[10px] font-medium mb-1", isCurrentDay ? "text-white" : "text-gray-400")}>
                Day {dayNum}
              </span>
              
              {isClaimed ? (
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check size={14} className="text-black stroke-[3]" />
                </div>
              ) : (
                <span className={cn("text-lg font-bold flex flex-col items-center", isCurrentDay ? "text-white" : "text-gray-300")}>
                  {reward}
                  <VaultyIcon size={10} className="mt-1" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleClaimReward}
        disabled={claimedToday || loading}
        className={cn(
          "w-full py-4 rounded-xl font-bold text-lg tracking-wide transition-all duration-300 relative overflow-hidden group",
          claimedToday || loading
            ? "bg-white/5 text-gray-500 cursor-not-allowed"
            : "text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]"
        )}
      >
        {!(claimedToday || loading) && (
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 group-hover:scale-105 transition-transform duration-300" />
        )}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading ? (
            "Claiming..."
          ) : claimedToday ? (
            <>
              <Check size={20} /> Come back tomorrow
            </>
          ) : (
            <>
              Claim {dailyRewards[(currentDay - 1) % 7] || 25} <VaultyIcon size={20} />
            </>
          )}
        </span>
      </button>
    </div>
  );
}
