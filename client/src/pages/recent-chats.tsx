import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, getDoc, Query, CollectionReference } from "firebase/firestore";
import { ChevronLeft, Edit, Camera, Bot, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

interface ChatPreview {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTimestamp: any;
  lastMessageSender: string;
  otherUser?: any;
}

export default function RecentChats() {
  const { user, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestCount, setRequestCount] = useState(0);
  const [showTab, setShowTab] = useState<"chats" | "requests">("chats");
  
  // Companions state
  const [companions, setCompanions] = useState<any[]>([]);

  useEffect(() => {
    // Load companions from localStorage
    const loadCompanions = () => {
      const stored = JSON.parse(localStorage.getItem("vaulty_companions") || "[]");
      setCompanions(stored);
    };
    
    loadCompanions();
    window.addEventListener("storage", loadCompanions);
    
    // Refresh on focus to catch new creations
    window.addEventListener("focus", loadCompanions);
    
    return () => {
      window.removeEventListener("storage", loadCompanions);
      window.removeEventListener("focus", loadCompanions);
    };
  }, []);

  useEffect(() => {
    if (!user || authLoading) {
      setLoading(true);
      return;
    }

    setLoading(true);

    // Query all chats
    const q = query(collection(db, "chats"), orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const userChats = snapshot.docs.filter((doc) => {
            const data = doc.data();
            return data.participants && data.participants.includes(user.uid);
          });

          const chatData = await Promise.all(
            userChats.map(async (chatDoc) => {
              const data = chatDoc.data();
              const otherUserId = data.participants.find((uid: string) => uid !== user.uid);
              
              let otherUser = null;
              if (otherUserId && otherUserId !== "global") {
                try {
                  const userDoc = await getDoc(doc(db, "users", otherUserId));
                  if (userDoc.exists()) {
                    otherUser = userDoc.data();
                  }
                } catch (err) {
                  console.error("Error fetching user:", err);
                }
              } else if (data.participants.includes("global")) {
                otherUser = { displayName: "Global Chat", photoURL: "", isGlobal: true };
              }

              return {
                id: chatDoc.id,
                ...data,
                otherUser
              } as ChatPreview;
            })
          );

          setChats(chatData);
          setLoading(false);
        } catch (err) {
          console.error("Error processing chats:", err);
          setLoading(false);
        }
      }
    );

    // Listen to message requests count
    const requestsQuery = query(
      collection(db, "messageRequests"),
      orderBy("timestamp", "desc")
    );

    const requestsUnsub = onSnapshot(requestsQuery, (snapshot) => {
      const count = snapshot.docs.filter(doc => doc.data().recipientId === user.uid).length;
      setRequestCount(count);
    });

    return () => {
      unsubscribe();
      requestsUnsub();
    };
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6 bg-black/80 backdrop-blur-md sticky top-0 z-10 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button onClick={() => setLocation("/")} className="text-white">
            <ChevronLeft size={28} />
          </button>
          <h1 className="text-xl font-bold">{user?.displayName || "Messages"}</h1>
        </div>
        <div className="flex items-center gap-2">
           <Button 
            size="sm" 
            variant="outline" 
            className="bg-transparent border-blue-500 text-blue-400 hover:bg-blue-900/20 gap-1 text-xs h-8"
            onClick={() => setLocation("/create-companion")}
           >
             <Plus size={14} /> Create Companion
           </Button>
          <Edit size={24} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 px-4 py-3 border-b border-white/10 sticky top-16 z-10 bg-black/80">
        <button
          onClick={() => setShowTab("chats")}
          className={`font-semibold text-sm transition-colors pb-2 ${
            showTab === "chats"
              ? "text-blue-500 border-b-2 border-blue-500"
              : "text-zinc-400"
          }`}
        >
          Messages
        </button>
        <button
          onClick={() => setShowTab("requests")}
          className={`font-semibold text-sm transition-colors pb-2 relative ${
            showTab === "requests"
              ? "text-blue-500 border-b-2 border-blue-500"
              : "text-zinc-400"
          }`}
        >
          Requests
          {requestCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {requestCount > 9 ? "9+" : requestCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-20">
        {showTab === "chats" ? (
          <div className="space-y-4">
            
            {/* Vaulty Companions Section */}
            {companions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Vaulty Companions</h3>
                <div className="space-y-4">
                  {companions.map(comp => (
                    <div 
                      key={comp.id} 
                      onClick={() => setLocation(`/messages/companion/${comp.id}`)}
                      className="flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity"
                    >
                      <Avatar className="w-14 h-14 border-2 border-blue-500/30">
                        <AvatarImage src={comp.avatar} className="object-cover" />
                        <AvatarFallback>{comp.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium truncate">{comp.name}</h3>
                          <span className="text-[10px] bg-blue-900/50 text-blue-300 px-1.5 rounded uppercase">{comp.role}</span>
                        </div>
                        <p className="text-zinc-400 text-sm truncate">
                           Tap to chat with your AI companion
                        </p>
                      </div>
                      <Bot className="text-blue-500" size={20} />
                    </div>
                  ))}
                </div>
                <div className="h-px bg-white/10 my-4" />
              </div>
            )}

            {chats.length === 0 && companions.length === 0 ? (
              <div className="text-center text-zinc-500 py-10">
                <p>No messages yet. Start a conversation!</p>
              </div>
            ) : (
              chats.map((chat) => {
                if (!chat.otherUser && !chat.participants.includes("global")) return null;
                
                return (
                  <div 
                    key={chat.id} 
                    onClick={() => 
                      setLocation(
                        chat.otherUser?.isGlobal 
                          ? `/messages/global` 
                          : `/messages/${chat.participants.find(p => p !== user?.uid)}`
                      )
                    }
                    className="flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity"
                  >
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={chat.otherUser?.photoURL} className="object-cover" />
                      <AvatarFallback>{chat.otherUser?.displayName?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <h3 className="text-white font-medium truncate">{chat.otherUser?.displayName || "Unknown User"}</h3>
                      <div className="flex items-center gap-1 text-zinc-400 text-sm">
                        <p className="truncate">
                          {chat.lastMessageSender === user?.uid ? "You: " : ""}{chat.lastMessage}
                        </p>
                        <span>•</span>
                        <span>
                          {chat.lastMessageTimestamp?.toDate
                            ? formatDistanceToNow(chat.lastMessageTimestamp.toDate(), { addSuffix: false })
                                .replace("about ", "")
                                .replace(" hours", "h")
                                .replace(" minutes", "m")
                            : "now"}
                        </span>
                      </div>
                    </div>
                    <Camera className="text-zinc-500" size={24} />
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setLocation("/message-requests")}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              View All Requests ({requestCount})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
