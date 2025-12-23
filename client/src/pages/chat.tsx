import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { ChevronLeft, Info, Image as ImageIcon, Heart, Send, Smile, X, Mic, Camera, Reply, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { 
  collection, query, orderBy, onSnapshot, 
  addDoc, serverTimestamp, doc, setDoc, 
  updateDoc, limit, Timestamp, getDoc
} from "firebase/firestore";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  imageURL?: string;
  senderId: string;
  senderName?: string;
  timestamp: Timestamp;
  reactions?: { [userId: string]: string };
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  read?: boolean;
}

const REACTIONS = ["👍🏻", "😂", "❤️", "😭", "💪🏻"];

export default function Chat() {
  const [match, params] = useRoute("/messages/:id");
  const targetUserId = params?.id || "global";
  const isGlobal = targetUserId === "global";
  
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeReactionMessage, setActiveReactionMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatId, setChatId] = useState<string | null>(null);

  // Determine Chat ID
  useEffect(() => {
    if (!user || !targetUserId) return;
    if (isGlobal) {
      setChatId("global");
      setTargetUser({ displayName: "Global Chat", photoURL: "", isGlobal: true });
      return;
    }
    const ids = [user.uid, targetUserId].sort();
    const generatedChatId = `${ids[0]}_${ids[1]}`;
    setChatId(generatedChatId);

    getDoc(doc(db, "users", targetUserId)).then(snap => {
        if (snap.exists()) {
            setTargetUser(snap.data());
        }
    });
  }, [user, targetUserId, isGlobal]);

  // Listen to Messages
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(msgs);

      // Mark messages as read
      if (user && !isGlobal) {
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.senderId !== user.uid && !data.read) {
            updateDoc(doc.ref, { read: true }).catch(err => console.error("Error marking as read:", err));
          }
        });
      }
    });

    return () => unsubscribe();
  }, [chatId, user, isGlobal]);

  // Check if user is online (simulate for now)
  useEffect(() => {
    setIsOnline(Math.random() > 0.5);
  }, [targetUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (imageURL?: string) => {
    if ((!inputText.trim() && !imageURL) || !user || !chatId) return;
    
    const text = inputText;
    setInputText("");
    setReplyingTo(null);
    setSending(true);

    try {
      await setDoc(doc(db, "chats", chatId), {
        participants: isGlobal ? ["global"] : [user.uid, targetUserId],
        lastMessage: imageURL ? "📷 Image" : text,
        lastMessageTimestamp: serverTimestamp(),
        lastMessageSender: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      const messageData: any = {
        text: text || "",
        senderId: user.uid,
        senderName: user.displayName || "User",
        timestamp: serverTimestamp(),
        reactions: {},
        read: true
      };

      if (imageURL) {
        messageData.imageURL = imageURL;
      }

      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text,
          senderName: replyingTo.senderName || "User"
        };
      }

      await addDoc(collection(db, "chats", chatId, "messages"), messageData);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        const maxWidth = 600;
        const maxHeight = 600;
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
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const compressed = await compressImage(base64);
        handleSend(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!chatId || !user) return;
    const msgRef = doc(db, "chats", chatId, "messages", messageId);
    await updateDoc(msgRef, {
      [`reactions.${user.uid}`]: emoji
    });
    setActiveReactionMessage(null);
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    return format(timestamp.toDate(), "HH:mm");
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white relative overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
                <button onClick={() => setLocation("/messages")} className="text-white">
                    <ChevronLeft size={28} />
                </button>
                <div className="flex items-center gap-3 relative">
                    <div className="relative">
                      <Avatar className="w-10 h-10 border border-white/10">
                          <AvatarImage src={targetUser?.photoURL} />
                          <AvatarFallback>{targetUser?.displayName?.[0]}</AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                      )}
                    </div>
                    <div>
                        <h2 className="font-bold text-sm">{targetUser?.displayName || "Loading..."}</h2>
                        <p className="text-xs text-zinc-400">{isOnline ? "Active now" : targetUser?.username || "Active now"}</p>
                    </div>
                </div>
            </div>
            <div className="relative">
                <button onClick={() => setShowInfoMenu(!showInfoMenu)} className="text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                    <Info size={24} />
                </button>
                
                {/* Info Menu */}
                <AnimatePresence>
                  {showInfoMenu && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden z-50 min-w-48"
                    >
                      <button className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2">
                        <span>ℹ️</span> Profile Info
                      </button>
                      <button className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2">
                        <span>🚫</span> Block User
                      </button>
                      <button className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-800 transition-colors text-red-400 flex items-center gap-2">
                        <span>⚠️</span> Report User
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 pb-24 scrollbar-hide">
            {messages.map((msg, index) => {
                const isMe = msg.senderId === user?.uid;
                const showAvatar = !isMe && (index === messages.length - 1 || messages[index + 1]?.senderId !== msg.senderId);
                const showTime = index === messages.length - 1 || (messages[index+1]?.timestamp?.toMillis?.() - msg.timestamp?.toMillis?.() > 300000);

                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id} 
                        className={cn("flex w-full mb-4", isMe ? "justify-end" : "justify-start")}
                    >
                        {!isMe && (
                             <div className="w-8 mr-2 flex-shrink-0 flex items-end">
                                {showAvatar ? (
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={targetUser?.photoURL} />
                                        <AvatarFallback>?</AvatarFallback>
                                    </Avatar>
                                ) : <div className="w-8" />}
                             </div>
                        )}

                        <div className={cn("max-w-[70%] relative group")}>
                            {msg.replyTo && (
                                <div className={cn("text-xs mb-1 p-2 rounded-lg bg-white/10 border-l-2 border-white/50 opacity-80", isMe ? "text-right" : "text-left")}>
                                    <p className="font-bold text-white/70">Replying to {msg.replyTo.senderName}</p>
                                    <p className="truncate">{msg.replyTo.text}</p>
                                </div>
                            )}

                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                <div className={cn("mb-1 flex bg-zinc-900 rounded-full px-1 py-0.5 border border-zinc-700 w-fit", isMe ? "ml-auto" : "")}>
                                    {Object.entries(msg.reactions).map(([uid, emoji], i) => (
                                        <span key={i} className="text-sm">{emoji}</span>
                                    ))}
                                </div>
                            )}

                            <div 
                                onClick={() => setActiveReactionMessage(activeReactionMessage === msg.id ? null : msg.id)}
                                onDoubleClick={() => handleReaction(msg.id, "❤️")}
                                className={cn(
                                    "relative overflow-hidden cursor-pointer transition-all",
                                    isMe 
                                        ? "bg-purple-600 text-white rounded-[20px] rounded-br-sm" 
                                        : "bg-zinc-800 text-white rounded-[20px] rounded-bl-sm"
                                )}
                            >
                              {msg.imageURL ? (
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImage(msg.imageURL || null);
                                  }}
                                  className="cursor-pointer overflow-hidden"
                                >
                                  <img 
                                    src={msg.imageURL} 
                                    alt="Message" 
                                    className="w-full h-auto max-h-80 object-cover"
                                  />
                                </div>
                              ) : null}
                              {msg.text && (
                                <div className="px-4 py-2 text-[15px] leading-snug break-words">
                                  {msg.text}
                                </div>
                              )}
                            </div>

                            {showTime && (
                                <p className={cn("text-[10px] text-zinc-500 mt-1", isMe ? "text-right" : "text-left")}>
                                    {formatMessageTime(msg.timestamp)}
                                </p>
                            )}

                            {/* Reaction Menu Popup */}
                            <AnimatePresence>
                              {activeReactionMessage === msg.id && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0, y: -10 }}
                                  animate={{ scale: 1, opacity: 1, y: 0 }}
                                  exit={{ scale: 0, opacity: 0, y: -10 }}
                                  className={cn(
                                    "absolute -top-16 z-50 flex gap-1 bg-zinc-800 rounded-full px-3 py-2 border border-zinc-700 shadow-xl whitespace-nowrap",
                                    isMe ? "right-0" : "left-0"
                                  )}
                                >
                                  {REACTIONS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReaction(msg.id, emoji);
                                        setActiveReactionMessage(null);
                                      }}
                                      className="p-1 hover:bg-zinc-700 rounded-full text-lg transition-colors hover:scale-125"
                                      title={emoji}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                  <div className="w-px bg-zinc-700" />
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReplyingTo(msg);
                                      setActiveReactionMessage(null);
                                    }}
                                    className="p-1 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors"
                                    title="Reply"
                                  >
                                    <Reply size={18} />
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                );
            })}
            <div ref={messagesEndRef} />
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

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black border-t border-white/10">
            {replyingTo && (
                <div className="flex justify-between items-center mb-2 px-4 py-2 bg-zinc-900 rounded-lg text-xs text-zinc-400">
                    <div>
                        <span className="font-bold text-white">Replying to {replyingTo.senderName || "User"}</span>
                        <p className="truncate max-w-[200px]">{replyingTo.text}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)}><X size={16} /></button>
                </div>
            )}
            
            <div className="flex items-center gap-3 bg-zinc-900 rounded-full px-4 py-2.5 border border-zinc-800 focus-within:border-zinc-700 transition-colors">
                <input 
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                />
                <div className="flex items-center gap-3 bg-zinc-800/50 p-1.5 rounded-full">
                   <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 p-1.5 rounded-full text-white hover:bg-blue-700 transition-colors"
                   >
                       <ImageIcon size={16} fill="white" />
                   </button>
                </div>
                
                <input 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Message..."
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-zinc-500 text-[15px]"
                />
                
                {inputText.trim() ? (
                    <button onClick={() => handleSend()} className="text-blue-500 font-semibold text-sm hover:text-blue-400 transition-colors">
                        Send
                    </button>
                ) : (
                    <div className="flex items-center gap-3 text-white">
                        <button><Mic size={22} /></button>
                        <button><Heart size={22} /></button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
