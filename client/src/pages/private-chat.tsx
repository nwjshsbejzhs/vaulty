import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { 
  ChevronLeft, Send, Paperclip, MoreVertical, 
  ShieldCheck, Clock, CheckCircle2, AlertCircle,
  Phone, Video, FileText, DollarSign
} from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { 
  collection, query, orderBy, onSnapshot, 
  addDoc, serverTimestamp, doc, getDoc, setDoc, 
  updateDoc, limit, Timestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp;
  read: boolean;
  type?: "text" | "offer" | "system";
}

export default function PrivateChat() {
  const [match, params] = useRoute("/chat/private/:userId");
  const targetUserId = params?.userId;
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [targetUser, setTargetUser] = useState<any>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch target user info
  useEffect(() => {
    if (!targetUserId) return;
    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", targetUserId));
        if (userDoc.exists()) {
          setTargetUser(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, [targetUserId]);

  // Determine Chat ID
  useEffect(() => {
    if (!user || !targetUserId) return;
    const ids = [user.uid, targetUserId].sort();
    setChatId(`${ids[0]}_${ids[1]}`);
  }, [user, targetUserId]);

  // Subscribe to messages
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(msgs);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [chatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user || !chatId) return;

    const text = inputText;
    setInputText("");

    try {
      // Update chat metadata
      await setDoc(doc(db, "chats", chatId), {
        participants: [user.uid, targetUserId],
        lastMessage: text,
        lastMessageTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
        type: "private"
      }, { merge: true });

      // Add message
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text,
        senderId: user.uid,
        timestamp: serverTimestamp(),
        read: false,
        type: "text"
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Sidebar / Context (Hidden on mobile, visible on large screens) */}
      <div className="hidden md:flex w-80 flex-col border-r border-white/5 bg-zinc-900/50 backdrop-blur-xl p-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="text-white" size={20} />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Secure Deal</h2>
            <p className="text-xs text-gray-400">End-to-end encrypted</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Safety Tips</h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex gap-2">
                <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                <span>Keep communication inside the app</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                <span>Never share private keys</span>
              </li>
              <li className="flex gap-2">
                <AlertCircle size={16} className="text-yellow-500 shrink-0" />
                <span>Report suspicious behavior</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-xl p-4 border border-cyan-500/10">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-cyan-400" />
              <span className="font-semibold text-cyan-400">Escrow Service</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Protect your funds using our secure escrow service for this transaction.
            </p>
            <Button size="sm" variant="outline" className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
              Initiate Escrow
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-zinc-950">
        {/* Professional Header */}
        <div className="h-16 border-b border-white/5 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/earn")} className="md:hidden text-gray-400">
              <ChevronLeft size={24} />
            </Button>
            
            <div className="relative">
              <Avatar className="h-10 w-10 ring-2 ring-white/10">
                <AvatarImage src={targetUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUserId}`} />
                <AvatarFallback>{targetUser?.displayName?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-zinc-900 rounded-full"></span>
            </div>
            
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                {targetUser?.displayName || "User"}
                {targetUser?.isVerified && <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">VERIFIED</Badge>}
              </h3>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={10} /> Active now
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/5">
              <Phone size={18} />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/5">
              <Video size={18} />
            </Button>
            <Separator orientation="vertical" className="h-6 bg-white/10 mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/5">
                  <MoreVertical size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white">
                <DropdownMenuLabel>Options</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">View Profile</DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-white/10 cursor-pointer text-red-400">Block User</DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-white/10 cursor-pointer text-red-400">Report</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 bg-[url('https://replit.com/public/images/dark-pattern.png')] bg-repeat opacity-90">
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-gray-500">
                <ShieldCheck size={12} />
                This conversation is end-to-end encrypted
              </div>
            </div>

            {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                    <p>No messages yet. Start the conversation!</p>
                </div>
            ) : (
                messages.map((msg, index) => {
                const isMe = msg.senderId === user?.uid;
                const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);

                return (
                    <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}
                    >
                    {!isMe && (
                        <div className="w-8 flex-shrink-0">
                        {showAvatar && (
                            <Avatar className="w-8 h-8 ring-1 ring-white/10">
                            <AvatarImage src={targetUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUserId}`} />
                            <AvatarFallback>?</AvatarFallback>
                            </Avatar>
                        )}
                        </div>
                    )}

                    <div className={`max-w-[70%] group relative ${!isMe && !showAvatar ? "ml-11" : ""}`}>
                        <div 
                        className={`
                            px-4 py-2.5 rounded-2xl text-sm shadow-sm
                            ${isMe 
                            ? "bg-cyan-600 text-white rounded-br-none" 
                            : "bg-white/10 text-gray-100 rounded-bl-none border border-white/5"
                            }
                        `}
                        >
                        {msg.text}
                        </div>
                        <span className={`text-[10px] text-gray-500 mt-1 block ${isMe ? "text-right" : "text-left"}`}>
                        {msg.timestamp?.toDate ? formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true }) : "Just now"}
                        </span>
                    </div>
                    </motion.div>
                );
                })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-zinc-900/80 backdrop-blur-md border-t border-white/5">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/5 h-10 w-10 rounded-full">
              <Paperclip size={20} />
            </Button>
            <div className="flex-1 bg-white/5 rounded-2xl border border-white/10 focus-within:border-cyan-500/50 focus-within:bg-white/10 transition-all flex items-center px-4 py-2">
              <Input 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a secure message..." 
                className="bg-transparent border-none p-0 h-auto focus-visible:ring-0 placeholder:text-gray-500"
              />
            </div>
            <Button 
              onClick={handleSend}
              className="h-10 w-10 rounded-full bg-cyan-500 hover:bg-cyan-600 text-black shrink-0 transition-transform active:scale-95"
            >
              <Send size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
