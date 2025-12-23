import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { doc, updateDoc, runTransaction, arrayUnion, increment, addDoc, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export function useRewards() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const checkDailyLimit = (field: string, limit: number) => {
    if (!userData) return false;
    const today = new Date().toISOString().split('T')[0];
    
    // Check if the date matches today
    if (userData[`last${field}Date`] === today) {
       return (userData[`${field}Count`] || 0) < limit;
    }
    // If date is different (or null), limit is not reached (count will reset)
    return true;
  };

  const incrementDailyCounter = async (field: string) => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      const userRef = doc(db, "users", user.uid);

      if (userData?.[`last${field}Date`] === today) {
          await updateDoc(userRef, {
              [`${field}Count`]: increment(1)
          });
      } else {
          // Reset for new day
          await updateDoc(userRef, {
              [`last${field}Date`]: today,
              [`${field}Count`]: 1
          });
      }
  };

  const addRewards = async (vp: number, xp: number, source: string) => {
    if (!user) return;
    try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            vaultyPoints: increment(vp),
            xp: increment(xp)
        });
        
        // Add Notification
        await addDoc(collection(db, "users", user.uid, "notifications"), {
            type: "reward",
            message: `You earned ${vp} VP and ${xp} XP from ${source}!`,
            timestamp: new Date(),
            read: false
        });
        
        toast({
            title: `Reward Claimed: ${source}`,
            description: `+${vp} VP, +${xp} XP`,
            duration: 3000
        });
        return true;
    } catch (e) {
        console.error("Error adding rewards", e);
        toast({ title: "Error claiming reward", variant: "destructive" });
        return false;
    }
  };

  const claimDailyLogin = async () => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      
      if (userData?.lastDailyLogin === today) {
          toast({ title: "Already claimed today!", variant: "destructive" });
          return;
      }

      setLoading(true);
      try {
          await updateDoc(doc(db, "users", user.uid), {
              lastDailyLogin: today,
              vaultyPoints: increment(2),
              xp: increment(50)
          });
          
          await addDoc(collection(db, "users", user.uid, "notifications"), {
            type: "reward",
            message: `Daily Login claimed! +2 VP, +50 XP`,
            timestamp: new Date(),
            read: false
          });

          toast({ title: "Daily Login", description: "+2 VP, +50 XP" });
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const watchVideo = async () => {
      // Changed to "Coming Soon" as requested
      toast({ 
          title: "Coming Soon...", 
          description: "Video ads are not available yet.",
          variant: "default" 
      });
  };

  const shareOnTwitter = async () => {
      if (!checkDailyLimit('Twitter', 5)) {
          toast({ title: "Daily share limit reached (5/5)", variant: "destructive" });
          return;
      }

      setLoading(true);
      try {
          await incrementDailyCounter('Twitter');
          await addRewards(10, 10, "Twitter Share");
      } finally {
          setLoading(false);
      }
  };

  const inviteFriend = async () => {
      // Logic handled in UI (Modal with Promo Code)
      // No rewards given here immediately
  };

  return {
      claimDailyLogin,
      watchVideo,
      shareOnTwitter,
      inviteFriend,
      loading
  };
}
