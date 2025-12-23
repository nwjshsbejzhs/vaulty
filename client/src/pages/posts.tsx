import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, limit, getDocs, where } from "firebase/firestore";
import { Image as ImageIcon, Send, Loader2, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { PostCard } from "@/components/post-card";
import { useToast } from "@/hooks/use-toast";
import vaultyLogo from "@assets/1B800ADD-4D3C-4FAB-8D82-8893E729D46A_1765492359150.jpeg";
import { isAdmin, isSuperAdmin } from "@/lib/admins";

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

export default function Posts() {
  const { user, userData } = useAuth();
  const [location, setLocation] = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Vaulty Bot Logic
  useEffect(() => {
    const BOT_ID = "vaulty-official-bot";
    const POST_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

    const botMessages = [
      "Follow US on Instagram @vaulty.app! 📸",
      "Did you know you can track your crypto portfolio in real-time with Vaulty? 🚀",
      "Stay safe! Never share your private keys or passwords with anyone. 🔒",
      "Market volatility is high today! Trade carefully. 📉📈",
      "Join our Discord community to chat with other traders! 💬",
      "New features coming soon! Stay tuned. ✨",
      "Remember to diversify your portfolio for better risk management. 📊",
      "Tip of the day: Set realistic goals and stick to them! 🎯",
      "We love our community! Thanks for being part of Vaulty. ❤️",
      "Check out the AI Assistant for personalized financial advice! 🤖"
    ];

    const checkAndPostBotMessage = async () => {
      try {
        const q = query(
          collection(db, "posts"), 
          where("userId", "==", BOT_ID),
          orderBy("timestamp", "desc"),
          limit(1)
        );
        
        const snapshot = await getDocs(q);
        let shouldPost = false;

        if (snapshot.empty) {
          shouldPost = true;
        } else {
          const lastPost = snapshot.docs[0].data();
          if (lastPost.timestamp) {
            const lastPostDate = lastPost.timestamp.toDate();
            const now = new Date();
            const diff = now.getTime() - lastPostDate.getTime();
            if (diff > POST_INTERVAL_MS) {
              shouldPost = true;
            }
          }
        }

        if (shouldPost) {
          const randomMessage = botMessages[Math.floor(Math.random() * botMessages.length)];
          
          await addDoc(collection(db, "posts"), {
            userId: BOT_ID,
            userName: "Vaulty Bot",
            userPhoto: vaultyLogo,
            userXP: 500000,
            content: randomMessage,
            likes: [],
            timestamp: serverTimestamp(),
            isBot: true
          });
        }
      } catch (error) {
        console.error("Bot posting error:", error);
      }
    };

    checkAndPostBotMessage();
    const intervalId = setInterval(checkAndPostBotMessage, 60000);
    return () => clearInterval(intervalId);
  }, []);

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
                if (user && (user.uid === p.userId || isSuperAdmin(user.email))) {
                  return true;
                }
                return false;
             }
             return true;
          });
          
          setPosts(cleanPosts);
          setLoading(false);
      });
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !user) return;
    setIsPosting(true);

    try {
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        userName: user.displayName || "User",
        userPhoto: user.photoURL || "",
        userXP: userData?.vaultyPoints || 0,
        content: newPostContent,
        likes: [],
        timestamp: serverTimestamp(),
      });
      setNewPostContent("");
      toast({
        title: "Posted!",
        description: "Your post is now live.",
      });
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        await deleteDoc(doc(db, "posts", postId));
        toast({
          title: "Deleted",
          description: "Post has been removed.",
        });
      } catch (error) {
        console.error("Error deleting post:", error);
      }
    }
  };

  const handleReportPost = (postId: string) => {
    toast({
      title: "Reported",
      description: "Thanks for helping keep our community safe.",
    });
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Community Feed
        </h1>
      </div>

      {/* Create Post Card */}
      <div className="max-w-xl mx-auto pt-6 px-4">
        <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-2xl p-4 shadow-xl mb-8 relative overflow-hidden group">
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
            </div>
          </div>
          
          {/* Actions - Moved outside the flex-1 wrapper to be full width and left aligned */}
          <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-2">
             <div className="flex gap-2">
               <button className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-full transition-colors" title="Add Image">
                 <ImageIcon size={20} />
               </button>
               <button className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-full transition-colors" title="AI Enhance">
                 <Sparkles size={20} />
               </button>
             </div>
             <button 
               onClick={handleCreatePost}
               disabled={!newPostContent.trim() || isPosting}
               className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center gap-2"
             >
               {isPosting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
               Post
             </button>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {loading ? (
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
  );
}
