import { VaultyIcon } from "@/components/ui/vaulty-icon";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notification-context";
import { useState, useEffect, useRef } from "react";
import { 
    Search, Bell, Wallet, Loader2, Sparkles, Send, Image as ImageIcon, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, getDocs, addDoc, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PostCard } from "@/components/post-card";
import { isAdmin, isSuperAdmin } from "@/lib/admins";
import { motion } from "framer-motion";

// Assets
import vaultyChristmasLogo from "@assets/vaultylogo_christmas_1765723902692.png";
import badgeProImage from "@assets/image_1766097473552.png";
import badgeUltraImage from "@assets/image_1766097497589.png";
import badgeMaxImage from "@assets/image_1766097506015.png";

interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  userXP?: number;
  content: string;
  imageURL?: string;
  likes: string[];
  timestamp: any;
}

export default function Home() {
  const { user, userData } = useAuth();
  const { unreadCount } = useNotifications();
  
  const [showPremiumBanner, setShowPremiumBanner] = useState(true);

  // Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);
  const badges = [badgeProImage, badgeUltraImage, badgeMaxImage];
  const badgeLabels = ["PRO", "ULTRA", "MAX"];

  // Auto-rotate premium badges
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBadgeIndex(prev => (prev + 1) % badges.length);
    }, 5000); 
    return () => clearInterval(interval);
  }, [badges.length]);

  // Feed - Load posts from Firebase
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));
      
      const bannedQuery = query(collection(db, "users"), where("isBanned", "==", true));
      const ghostQuery = query(collection(db, "users"), where("isGhost", "==", true));

      Promise.all([getDocs(bannedQuery), getDocs(ghostQuery)]).then(([bannedSnap, ghostSnap]) => {
          const bannedIds = new Set(bannedSnap.docs.map(d => d.id));
          const ghostIds = new Set(ghostSnap.docs.map(d => d.id));
          
          const cleanPosts = postsData.filter(p => {
             if (bannedIds.has(p.userId)) return false;
             if (ghostIds.has(p.userId)) {
                if (user && (user.uid === p.userId || isSuperAdmin(user?.email))) {
                  return true;
                }
                return false;
             }
             return true;
          });
          
          setPosts(cleanPosts);
          setLoadingFeed(false);
      });
    });

    return () => unsubscribe();
  }, [user]);

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        const maxWidth = 800;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = base64;
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // toast({ title: "Image too large", description: "Please select an image smaller than 5MB", variant: "destructive" });
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const compressed = await compressImage(base64);
        setSelectedImage(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async () => {
    if ((!newPostContent.trim() && !selectedImage) || !user) return;
    setIsPosting(true);

    try {
      const postData: any = {
        userId: user.uid,
        userName: user.displayName || "User",
        userPhoto: user.photoURL || "",
        userXP: userData?.vaultyPoints || 0,
        content: newPostContent,
        likes: [],
        timestamp: new Date(),
      };

      if (selectedImage) {
        postData.imageURL = selectedImage;
      }

      await addDoc(collection(db, "posts"), postData);
      setNewPostContent("");
      setSelectedImage(null);
      // toast({ title: "Posted!", description: "Your post is now live." });
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        await deleteDoc(doc(db, "posts", postId));
      } catch (error) {
        console.error("Error deleting post:", error);
      }
    }
  };

  const handleReportPost = (postId: string) => {
    // toast({ title: "Reported", description: "Thanks for helping keep our community safe." });
  };

  if (!user) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Redirecting...</div>;

  return (
    <div className="min-h-screen pb-24 bg-black text-white selection:bg-cyan-500/30">
      
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center">
        {showPremiumBanner && (
            <div className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 text-black p-3 relative shadow-lg animate-in fade-in slide-in-from-top-2 duration-500">
                 <Link href="/premium">
                     <div className="max-w-md mx-auto flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-3 flex-1">
                            <motion.img 
                              key={currentBadgeIndex}
                              src={badges[currentBadgeIndex]} 
                              alt={badgeLabels[currentBadgeIndex]}
                              className="w-12 h-12 shrink-0 group-hover:scale-110"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.4, ease: "easeInOut" }}
                            />
                            <div>
                              <p className="text-base font-bold leading-tight text-black">
                                  Unlock Premium Features
                              </p>
                              <p className="text-sm font-medium text-black/80">
                                  Get {badgeLabels[currentBadgeIndex]} plan access
                              </p>
                            </div>
                        </div>
                     </div>
                 </Link>
                 <button 
                    onClick={() => setShowPremiumBanner(false)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
                 >
                    <div className="text-xs font-bold w-4 h-4 flex items-center justify-center text-black">✕</div>
                 </button>
            </div>
        )}
        <div className="w-full bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-md mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative">
              <img src={vaultyChristmasLogo} alt="Vaulty" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-bold tracking-widest text-white">
              VAULTY
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/wallet">
              <button 
                  className="relative p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 group text-gray-400 group-hover:text-white"
              >
                  <Wallet className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/notifications">
              <button className="relative p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 group text-gray-400 group-hover:text-white">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-2 w-2 h-2 bg-pink-500 rounded-full ring-2 ring-black" />
                  )}
              </button>
            </Link>
          </div>
        </div>
        </div>
      </div>

      {/* Content Spacer */}
      <div className={cn("relative z-10 p-6 max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500", showPremiumBanner ? "pt-40" : "pt-28")}>
          
            <div className="space-y-6">
              {/* Create Post Card */}
              <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-2xl p-4 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -z-10 group-hover:bg-cyan-500/20 transition-colors" />
                
                <div className="flex gap-4">
                  <img 
                    src={user?.photoURL || "https://github.com/shadcn.png"} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-white/10"
                    alt="Profile"
                  />
                  <div className="flex-1 space-y-4">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="What's happening in the crypto world?"
                      className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 resize-none h-24 text-lg p-0"
                    />
                    {selectedImage && (
                      <div className="relative rounded-lg overflow-hidden">
                        <img 
                          src={selectedImage} 
                          alt="Preview" 
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => setSelectedImage(null)}
                          className="absolute top-2 right-2 bg-black/70 hover:bg-black p-1 rounded-full text-white transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <input 
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                
                <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-2">
                   <div className="flex gap-2">
                     <button 
                       onClick={() => fileInputRef.current?.click()}
                       className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-full transition-colors" 
                       title="Add Image"
                     >
                       <ImageIcon size={20} />
                     </button>
                     <button className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-full transition-colors" title="AI Enhance">
                       <Sparkles size={20} />
                     </button>
                   </div>
                   <button 
                     onClick={handleCreatePost}
                     disabled={(!newPostContent.trim() && !selectedImage) || isPosting}
                     className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center gap-2"
                   >
                     {isPosting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                     Post
                   </button>
                </div>
              </div>

              {/* Posts Feed */}
              <div className="space-y-6">
                {loadingFeed ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading feed...</p>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="text-gray-500" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No posts yet</h3>
                    <p className="text-gray-400">Be the first to share something with the community!</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      currentUser={user} 
                      currentUserData={userData}
                      onDelete={handleDeletePost}
                      onReport={handleReportPost}
                      isAdmin={isAdmin(user?.email)}
                    />
                  ))
                )}
              </div>
            </div>
      </div>
    </div>
  );
}
