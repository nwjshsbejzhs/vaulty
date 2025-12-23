import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Flag, Send, Loader2, CircleDollarSign, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { db } from "@/lib/firebase";
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs,
  where
} from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Username } from "@/components/shared/Username";
import { getRank } from "@/lib/ranks";

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  userXP?: number;
  content: string;
  timestamp: any;
}

interface PostCardProps {
  post: any;
  currentUser: any;
  currentUserData?: any; // Added to get XP for comments
  onDelete?: (id: string) => void;
  onReport?: (id: string) => void;
  isDetailView?: boolean;
  isAdmin?: boolean;
}

export function PostCard({ post, currentUser, currentUserData, onDelete, onReport, isDetailView = false, isAdmin = false }: PostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(isDetailView);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [authorCurrentXP, setAuthorCurrentXP] = useState<number>(post.userXP || 0);
  
  // Tipping State
  const [tipOpen, setTipOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState(10);
  const [isTipping, setIsTipping] = useState(false);
  const [totalTipped, setTotalTipped] = useState(0);

  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const isLiked = post.likes?.includes(currentUser?.uid);

  // Fetch author's current XP to show correct rank
  useEffect(() => {
    try {
      const authorRef = doc(db, "users", post.userId);
      const unsubscribe = onSnapshot(authorRef, (snapshot) => {
        if (snapshot.exists()) {
          setAuthorCurrentXP(snapshot.data().xp || 0);
        }
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching author XP:", error);
    }
  }, [post.userId]);

  // Calculate rank for post author to determine if we should show icon
  const authorRank = getRank(authorCurrentXP);
  const showRankIcon = authorRank.minXP >= 5000; // Ruby (5000) and above

  // Load comments if open
  useEffect(() => {
    if (!commentsOpen) return;

    const q = query(
      collection(db, "posts", post.id, "comments"), 
      orderBy("timestamp", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Comment)));
    });

    return () => unsubscribe();
  }, [commentsOpen, post.id]);

  // Load total tips for this post
  useEffect(() => {
    const loadTotalTips = async () => {
      try {
        const tipsQuery = query(collection(db, "posts", post.id, "tips"));
        const tipsSnap = await getDocs(tipsQuery);
        const total = tipsSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        setTotalTipped(total);
      } catch (error) {
        console.error("Error loading tips:", error);
      }
    };
    loadTotalTips();
  }, [post.id]);

  const handleLike = async () => {
    if (!currentUser) return;
    const postRef = doc(db, "posts", post.id);
    if (isLiked) {
      await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Post link copied to clipboard.",
    });
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    setCommentLoading(true);
    try {
      await addDoc(collection(db, "posts", post.id, "comments"), {
        userId: currentUser.uid,
        userName: currentUser.displayName || "User",
        userPhoto: currentUser.photoURL || "",
        userXP: currentUserData?.vaultyPoints || 0,
        content: newComment,
        timestamp: serverTimestamp()
      });
      setNewComment("");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCommentLoading(false);
    }
  };

  const handleTip = async () => {
    if (!currentUser || !currentUserData) {
      toast({ title: "Error", description: "You must be logged in to tip.", variant: "destructive" });
      return;
    }

    if (tipAmount < 10 || tipAmount > 50000) {
      toast({ title: "Invalid Amount", description: "Tip amount must be between 10 and 50,000.", variant: "destructive" });
      return;
    }

    if ((currentUserData?.vaultyPoints || 0) < tipAmount) {
      toast({ title: "Insufficient Funds", description: "You don't have enough Vaulty Credits to send this tip.", variant: "destructive" });
      return;
    }
    
    setIsTipping(true);
    
    try {
      // Add tip to Firebase
      await addDoc(collection(db, "posts", post.id, "tips"), {
        userId: currentUser.uid,
        userName: currentUser.displayName || "User",
        userPhoto: currentUser.photoURL || "",
        amount: tipAmount,
        timestamp: serverTimestamp(),
      });

      // Deduct from user's Vaulty Points
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        vaultyPoints: (currentUserData?.vaultyPoints || 0) - tipAmount
      });

      // Update total tipped locally
      setTotalTipped(totalTipped + tipAmount);
      setTipOpen(false);
      setTipAmount(10);

      toast({
        title: "Tip Sent!",
        description: `You tipped ${tipAmount} Vaulty Credits!`,
      });
    } catch (error) {
      console.error("Error sending tip:", error);
      toast({
        title: "Error",
        description: "Failed to send tip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTipping(false);
    }
  };

  return (
    <div className="group relative bg-zinc-900/60 border border-white/10 rounded-3xl overflow-hidden mb-6 shadow-xl backdrop-blur-xl hover:border-cyan-500/30 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="p-5 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-3 items-center">
            <div 
              onClick={() => {
                if (currentUser?.uid === post.userId) {
                  toast({ title: "This is you!", description: "You are already viewing your own content." });
                } else {
                  setLocation(`/user/${post.userId}`);
                }
              }}
              className="relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500 to-purple-500 rounded-full opacity-70 blur-sm group-hover:opacity-100 transition-opacity" />
              <img 
                src={post.userPhoto || "https://github.com/shadcn.png"} 
                className="relative w-11 h-11 rounded-full object-cover border-2 border-black"
                alt={post.userName}
              />
            </div>
            <div>
              <div 
                onClick={() => {
                  if (currentUser?.uid === post.userId) {
                    toast({ title: "This is you!", description: "You are already viewing your own content." });
                  } else {
                    setLocation(`/user/${post.userId}`);
                  }
                }}
                className="cursor-pointer"
              >
                <Username 
                  name={post.userName} 
                  xp={authorCurrentXP} 
                  className="text-base hover:opacity-80" 
                  showRankIcon={showRankIcon} 
                  useDefaultColor={true}
                />
              </div>
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                {post.timestamp ? formatDistanceToNow(post.timestamp.toDate?.() || new Date(post.timestamp), { addSuffix: true }) : 'Just now'}
              </p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                <MoreHorizontal size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-950 border-white/10 text-white shadow-2xl rounded-xl p-1">
              <DropdownMenuItem onClick={() => onReport?.(post.id)} className="text-red-400 focus:text-red-400 focus:bg-white/5 cursor-pointer rounded-lg">
                <Flag className="mr-2 h-4 w-4" /> Report Post
              </DropdownMenuItem>
              {(currentUser?.uid === post.userId || isAdmin) && (
                <DropdownMenuItem onClick={() => onDelete?.(post.id)} className="text-red-400 focus:text-red-400 focus:bg-white/5 cursor-pointer rounded-lg">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="mb-5 pl-[56px]">
          <p className="text-gray-200 text-[15px] whitespace-pre-wrap leading-relaxed font-light tracking-wide">
            {post.content}
          </p>
          {post.imageURL && (
            <div 
              onClick={() => setSelectedImage(post.imageURL)}
              className="mt-4 rounded-2xl overflow-hidden border border-white/10 shadow-lg group-hover:shadow-cyan-900/20 transition-all cursor-pointer"
            >
              <img 
                src={post.imageURL} 
                className="w-full h-auto max-h-[500px] object-cover hover:scale-[1.02] transition-transform duration-500"
                alt="Post content"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pl-[56px] border-t border-white/5 pt-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 text-sm font-medium",
                isLiked 
                  ? "text-pink-500 bg-pink-500/10" 
                  : "text-gray-500 hover:text-pink-400 hover:bg-white/5"
              )}
            >
              <Heart size={18} className={cn("transition-transform group-active:scale-75", isLiked ? "fill-current" : "")} />
              <span>{post.likes?.length || 0}</span>
            </button>
            
            <button 
              onClick={() => setCommentsOpen(!commentsOpen)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 text-sm font-medium",
                commentsOpen 
                  ? "text-cyan-400 bg-cyan-400/10" 
                  : "text-gray-500 hover:text-cyan-400 hover:bg-white/5"
              )}
              title="Comments"
            >
              <MessageCircle size={18} />
              {comments.length > 0 && <span className="text-xs">{comments.length}</span>}
            </button>

            {/* TIP BUTTON */}
            <Dialog open={tipOpen} onOpenChange={setTipOpen}>
              <DialogTrigger asChild>
                <button 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 text-sm font-medium text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10"
                  title="Send Tip"
                >
                  <CircleDollarSign size={18} />
                </button>
              </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Send a Tip</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Support {post.userName} with Vaulty Credits.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center py-6 space-y-4">
                <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  Total Tipped: {totalTipped.toLocaleString()} VC
                </div>
                <div className="w-full max-w-xs space-y-2">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Amount (10 - 50,000)</label>
                  <Input 
                    type="number" 
                    min={10} 
                    max={50000} 
                    value={tipAmount} 
                    onChange={(e) => setTipAmount(Number(e.target.value))}
                    className="bg-white/5 border-white/10 text-white text-center text-lg font-mono focus:border-yellow-500/50 focus:ring-yellow-500/20"
                  />
                </div>
              </div>
              <DialogFooter className="flex-col gap-3 sm:flex-col items-center">
                 <p className="text-[10px] text-gray-500 text-center w-full">
                    By clicking Send Tip you agree to Vaulty TOS rules.
                 </p>
                 <Button 
                   onClick={handleTip} 
                   disabled={isTipping}
                   className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-black font-bold"
                 >
                   {isTipping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Send Tip
                 </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 text-sm font-medium text-gray-500 hover:text-green-400 hover:bg-white/5"
              title="Share"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Image Fullscreen Viewer */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedImage} 
                alt="Full size" 
                className="max-w-full max-h-[90vh] object-contain"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black rounded-full text-white transition-colors"
              >
                <X size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Section */}
      {commentsOpen && (
        <div className="bg-black/40 border-t border-white/5 p-5 pl-[20px] sm:pl-[76px] backdrop-blur-md">
          {/* Comment List */}
          <div className="space-y-4 mb-4">
            {comments.map((comment) => {
              // Calculate rank for comment author too
              const commentRank = getRank(comment.userXP || 0);
              const showCommentIcon = commentRank.minXP >= 5000;
              
              return (
                <div key={comment.id} className="flex gap-3 group">
                  <img 
                    src={comment.userPhoto || "https://github.com/shadcn.png"} 
                    className="w-8 h-8 rounded-full object-cover border border-white/10"
                    alt={comment.userName}
                  />
                  <div className="flex-1">
                    <div className="bg-white/5 rounded-2xl rounded-tl-none p-3 border border-white/5">
                      <div className="flex justify-between items-baseline mb-1">
                        <Link href={`/user/${comment.userId}`}>
                          <div className="cursor-pointer">
                            <Username 
                              name={comment.userName} 
                              xp={comment.userXP} 
                              className="text-xs hover:opacity-80" 
                              showRankIcon={showCommentIcon}
                            />
                          </div>
                        </Link>
                        <span className="text-[10px] text-gray-500">
                          {comment.timestamp ? formatDistanceToNow(comment.timestamp.toDate?.() || new Date(comment.timestamp), { addSuffix: true }) : 'Just now'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{comment.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Comment */}
          <div className="flex gap-3 items-end">
            <img 
              src={currentUser?.photoURL || "https://github.com/shadcn.png"} 
              className="w-8 h-8 rounded-full object-cover border border-white/10"
              alt="My Profile"
            />
            <div className="flex-1 relative">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none h-[46px] overflow-hidden"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePostComment();
                  }
                }}
              />
              <button
                onClick={handlePostComment}
                disabled={!newComment.trim() || commentLoading}
                className="absolute right-2 bottom-2 p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-full transition-colors disabled:opacity-50"
              >
                {commentLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
