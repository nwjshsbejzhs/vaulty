import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, Grid, Heart, Loader2, Ghost, Flag, MoreVertical, MessageCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, collection, query, where, orderBy, onSnapshot, updateDoc, arrayUnion, arrayRemove, increment, addDoc } from "firebase/firestore";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { isSuperAdmin } from "@/lib/admins";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export default function PublicProfile() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [match, params] = useRoute("/user/:id");
  const userId = params?.id;
  
  const [location, setLocation] = useLocation();
  const [userData, setUserData] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Real-time listener for profile user data
    const unsub = onSnapshot(doc(db, "users", userId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserData(data);
        // Check if current user is in the followers list
        if (currentUser && data.followers && data.followers.includes(currentUser.uid)) {
          setIsFollowing(true);
        } else {
          setIsFollowing(false);
        }
      }
    });
    return () => unsub();
  }, [userId, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser || !userId || followLoading) return;
    
    setFollowLoading(true);
    try {
      const userRef = doc(db, "users", userId);
      const currentUserRef = doc(db, "users", currentUser.uid);

      if (isFollowing) {
        // Unfollow
        await updateDoc(userRef, {
          followers: arrayRemove(currentUser.uid),
          followersCount: increment(-1)
        });
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId),
          followingCount: increment(-1)
        });
      } else {
        // Follow
        await updateDoc(userRef, {
          followers: arrayUnion(currentUser.uid),
          followersCount: increment(1)
        });
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId),
          followingCount: increment(1)
        });

        // Add Notification
        await addDoc(collection(db, "users", userId, "notifications"), {
            type: "follow",
            message: `${currentUser.displayName} started following you`,
            timestamp: new Date(),
            read: false
        });
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleReport = () => {
    toast({
      title: "Report Submitted",
      description: "We have received your report and will review it shortly.",
    });
  };

  if (!userId) return null;

  // Apply customizations if they exist in userData
  const customStyle = userData?.cardStyle ? {
      color: userData.cardStyle.color,
      scale: (userData.cardStyle.size || 100) / 100,
      animation: userData.cardStyle.animation
  } : undefined;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Top Controls - Outside the card */}
      <div className="flex justify-between items-center p-4 z-20 relative">
          <button 
            onClick={() => setLocation("/")}
            className="bg-black/50 backdrop-blur-md p-2 rounded-full text-white border border-white/20 hover:bg-black/70 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex gap-2">
             {currentUser?.uid !== userId && (
                <>
                  <button 
                    onClick={() => setLocation(`/messages/${userId}`)}
                    className="px-4 py-1.5 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all font-semibold text-sm"
                  >
                    Message
                  </button>
                </>
             )}

             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <button className="bg-black/50 backdrop-blur-md p-2 rounded-full text-white border border-white/20 hover:bg-black/70 transition-colors">
                   <MoreVertical size={20} />
                 </button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="bg-black/90 border-white/20 text-white z-50">
                 <DropdownMenuItem onClick={handleReport} className="text-red-400 focus:text-red-400 focus:bg-white/10">
                   <Flag className="mr-2 h-4 w-4" /> Report User
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
          </div>
      </div>

      {/* Profile Layout */}
      <div className="p-4 pt-2">
        {/* 3D Profile Card */}
        <div className="mb-6">
          <ProfileCard 
            user={userData} 
            isOwner={false} 
            hideControls={true} 
            customStyle={customStyle}
          />
        </div>
      </div>
    </div>
  );
}
