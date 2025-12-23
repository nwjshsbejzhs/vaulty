import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Bell, Gift, MessageCircle, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, addDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    if (!user) return;
    try {
        await updateDoc(doc(db, "users", user.uid, "notifications", id), {
            read: true
        });
    } catch (e) {
        console.error("Error marking read", e);
    }
  };

  const simulateNotification = async () => {
      if (!user) return;
      const types = ["message", "like", "follow", "rank_up"];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      let message = "";
      if (randomType === "message") message = "Alice sent you a message";
      if (randomType === "like") message = "Bob liked your post";
      if (randomType === "follow") message = "Charlie started following you";
      if (randomType === "rank_up") message = "You ranked up to Gold!";

      await addDoc(collection(db, "users", user.uid, "notifications"), {
          type: randomType,
          message: message,
          timestamp: new Date(),
          read: false
      });
  };

  const getIcon = (type: string) => {
    switch (type) {
        case "gift": return <Gift className="text-pink-400" size={20} />;
        case "admin_alert": return <AlertCircle className="text-red-400" size={20} />;
        case "message": return <MessageCircle className="text-blue-400" size={20} />;
        case "rank_up": return <CheckCircle2 className="text-yellow-400" size={20} />;
        default: return <Bell className="text-cyan-400" size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <button onClick={() => setLocation("/")} className="p-2 hover:bg-white/10 rounded-full">
             <ChevronLeft size={24} />
           </button>
           <h1 className="font-bold text-lg">Notifications</h1>
        </div>
        <button className="text-xs text-gray-400 font-medium hover:text-white">
            Mark all read
        </button>
      </div>

      <div className="p-4 space-y-2">
        {loading ? (
            <div className="text-center text-gray-500 py-10">Loading...</div>
        ) : notifications.length === 0 ? (
            <div className="text-center py-20 text-gray-500 flex flex-col items-center">
                <Bell size={48} className="mb-4 opacity-20" />
                <p>No notifications yet</p>
            </div>
        ) : (
            notifications.map((note) => (
                <div 
                    key={note.id} 
                    onClick={() => markAsRead(note.id)}
                    className={`p-4 rounded-2xl border flex gap-4 transition-colors cursor-pointer ${
                        note.read 
                            ? "bg-transparent border-transparent opacity-60 hover:bg-white/5" 
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                >
                    <div className="mt-1 min-w-[32px]">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                            {getIcon(note.type)}
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-200 leading-relaxed">{note.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                            {note.timestamp?.seconds 
                                ? new Date(note.timestamp.seconds * 1000).toLocaleString() 
                                : new Date().toLocaleDateString()
                            }
                        </p>
                    </div>
                    {!note.read && (
                        <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2" />
                    )}
                </div>
            ))
        )}
      </div>
    </div>
  );
}
