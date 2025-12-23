import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, Loader2 } from "lucide-react";
import { PostCard } from "@/components/post-card";

export default function PostDetail() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/post/:id");
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!params?.id) return;
      try {
        const postDoc = await getDoc(doc(db, "posts", params.id));
        if (postDoc.exists()) {
          setPost({ id: postDoc.id, ...postDoc.data() });
        }
      } catch (error) {
        console.error("Error fetching post:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [params?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="animate-spin w-8 h-8 text-cyan-400" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Post not found</p>
        <button 
          onClick={() => setLocation("/posts")}
          className="text-cyan-400 hover:underline"
        >
          Go back to feed
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 flex gap-3 items-center">
        <button onClick={() => setLocation("/posts")} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Post</h1>
      </div>

      <div className="max-w-xl mx-auto p-4 pt-6">
        <PostCard 
          post={post} 
          currentUser={user} 
          isDetailView={true}
        />
      </div>
    </div>
  );
}
