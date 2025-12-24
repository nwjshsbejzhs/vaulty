import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { 
  Send, X, Settings, History, Copy, Check, ThumbsUp, ThumbsDown, 
  Volume2, Menu, User, CreditCard, Crown, Sparkles, ChevronLeft,
  Paperclip, ChevronDown, Lock, Zap, HardDrive, LogOut
} from "lucide-react";
import { useLocation } from "wouter";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, query, getDocs, setDoc, increment, deleteDoc } from "firebase/firestore";
import { app, db } from "@/lib/firebase";
import { usePremium } from "@/contexts/premium-context";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import botAvatar from "@assets/1B800ADD-4D3C-4FAB-8D82-8893E729D46A_1765457083436.png";
import vaultyLogo from "@assets/1B800ADD-4D3C-4FAB-8D82-8893E729D46A_1765492359150.jpeg";

type Message = {
  role: "user" | "assistant";
  content: string;
  id?: string;
  sender?: string;
  timestamp?: number;
  isError?: boolean;
  feedback?: "positive" | "negative" | null;
};

interface ChatHistory {
  id: string;
  title: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  createdAt: number;
  updatedAt: number;
}

const MODELS = [
  { id: "v1-basic", name: "Vaulty 1.0 Basic", tier: "free", cost: 0.05 },
  { id: "v1-pro", name: "Vaulty 1.0 Pro", tier: "pro", cost: 0.20 },
  { id: "v1.5-basic", name: "Vaulty 1.5 Basic", tier: "free", cost: 0.10 },
  { id: "v1.5-pro", name: "Vaulty 1.5 Pro", tier: "pro", cost: 0.50 },
];

const LIMITS: Record<string, number> = {
  free: 10,
  pro: 30,
  ultra: 100,
  max: Infinity
};

const MEMORY_LIMITS: Record<string, number> = {
  free: 0.1,      // 0.1 GB = 100 MB
  pro: 1,         // 1 GB
  ultra: 5,       // 5 GB
  max: 20         // 20 GB
};

// 1 memory unit = 0.5-2 KB
const MEMORY_UNIT_KB = 1; // Using 1KB as default memory unit

// Konfiguracija za API (apiKey se vbrizga samodejno)
const apiKey = "AIzaSyBtRKYnFv7YvPjwEM9mcbl9oY0BpjCH5IU";
const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app-id';

export default function Ai() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const chatId = searchParams.get("chatId");
  const { subscription: contextSubscription, hasAccess } = usePremium();
  const { user } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [recentChats, setRecentChats] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [usage, setUsage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [memoryUsed, setMemoryUsed] = useState(0);
  const [memoryLimit, setMemoryLimit] = useState(0.1);
  const [showMemoryMenu, setShowMemoryMenu] = useState(false);
  const [swipeId, setSwipeId] = useState<string | null>(null);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Funkcija za klic pravega Gemini API-ja
  const getRealAIResponse = async (message: string, history: Message[]) => {
    const systemPrompt = "Ti si Vaulty AI, inteligenten pomočnik. Odgovarjaj v jeziku uporabnika.";
    
    const apiCall = async () => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              ...history.slice(-10).map(m => ({
                role: m.role === "user" ? "user" : "model",
                parts: [{ text: m.content }]
              })),
              { role: "user", parts: [{ text: message }] }
            ],
            systemInstruction: { parts: [{ text: systemPrompt }] }
          })
        }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Na žalost nisem mogel generirati odgovora.";
    };

    // Exponential backoff retry logic
    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        return await apiCall();
      } catch (err) {
        if (i === 4) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    return "Error: Could not connect to AI.";
  };

  useEffect(() => {
    if (user) {
      loadRecentChats();
      loadUsage();
    }
  }, [user, isSidebarOpen]);

  useEffect(() => {
    if (chatId && user) {
      loadChatHistory(chatId);
    }
  }, [chatId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const tier = contextSubscription || "free";
    setLimit(LIMITS[tier]);
    setMemoryLimit(MEMORY_LIMITS[tier]);
  }, [contextSubscription]);

  const loadUsage = async () => {
    if (!user) return;
    try {
      // Uporaba Rule 1 za poti v Firestore
      const docRef = doc(db, "artifacts", appId, "users", user.uid, "features", "ai_usage");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUsage(docSnap.data().used || 0);
        setMemoryUsed(docSnap.data().memoryUsed || 0);
      } else {
        setUsage(0);
        setMemoryUsed(0);
      }
    } catch (e) {
      console.error("Error loading usage:", e);
    }
  };

  const updateUsage = async (cost: number, messageLength: number = 0) => {
    if (!user) return;
    try {
      const memoryUsedByMessage = messageLength / (1024 * 1024 * 1024);
      const docRef = doc(db, "artifacts", appId, "users", user.uid, "features", "ai_usage");
      await setDoc(docRef, { 
        used: increment(cost),
        memoryUsed: increment(memoryUsedByMessage),
        lastUpdated: Date.now()
      }, { merge: true });
      setUsage(prev => prev + cost);
      setMemoryUsed(prev => prev + memoryUsedByMessage);
    } catch (e) {
      console.error("Error updating usage:", e);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      if (!user) return;
      await deleteDoc(doc(db, "artifacts", appId, "users", user.uid, "chatHistories", chatId));
      if (currentChatId === chatId) {
        setMessages([]);
        setCurrentChatId(null);
      }
      await loadRecentChats();
      toast({ title: "Chat deleted" });
      setSwipeId(null);
      setDeleteChatId(null);
    } catch (e) {
      console.error("Error deleting chat:", e);
      toast({ title: "Failed to delete chat", variant: "destructive" });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent, chatId: string) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe(touchStart, e.changedTouches[0].clientX, chatId);
  };

  const handleSwipe = (start: number, end: number, chatId: string) => {
    const distance = start - end;
    if (distance > 50) {
      setSwipeId(chatId);
    } else if (distance < -50) {
      setSwipeId(null);
    }
  };

  const loadRecentChats = async () => {
    try {
      if (!user) return;
      const chatsCollection = collection(db, "artifacts", appId, "users", user.uid, "chatHistories");
      const chatsSnapshot = await getDocs(query(chatsCollection));
      const chats: ChatHistory[] = [];
      chatsSnapshot.forEach((doc) => {
        chats.push({ id: doc.id, ...doc.data() } as ChatHistory);
      });
      chats.sort((a, b) => b.updatedAt - a.updatedAt);
      setRecentChats(chats.slice(0, 10));
    } catch (error) {
      console.error("Error loading recent chats:", error);
    }
  };

  const loadChatHistory = async (id: string) => {
    try {
      if (!user) return;
      const chatDoc = await getDoc(doc(db, "artifacts", appId, "users", user.uid, "chatHistories", id));
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        setMessages(chatData.messages || []);
        setCurrentChatId(id);
      }
    } catch (error) {
      console.error("Error loading chat:", error);
    }
  };

  const saveChatToFirebase = async (updatedMessages: Message[], userMessage: string) => {
    try {
      if (!user) return;
      const chatTitle = userMessage.slice(0, 30) + "...";

      if (currentChatId) {
        await updateDoc(doc(db, "artifacts", appId, "users", user.uid, "chatHistories", currentChatId), {
          messages: updatedMessages,
          updatedAt: Date.now(),
        });
      } else {
        const newChatDoc = await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chatHistories"), {
          title: chatTitle,
          messages: updatedMessages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setCurrentChatId(newChatDoc.id);
      }
      loadRecentChats();
    } catch (error) {
      console.error("Error saving chat:", error);
    }
  };

  const handleCopyMessage = (content: string) => {
    const el = document.createElement('textarea');
    el.value = content;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const handleSpeakMessage = (content: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(content);
      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Error",
        description: "Text-to-speech not supported in this browser",
        variant: "destructive"
      });
    }
  };

  const handleFeedback = (index: number, isPositive: boolean) => {
    const feedbackType = isPositive ? "positive" : "negative";
    
    setMessages(prev => prev.map((msg, i) => {
      if (i === index) {
        const newFeedback = msg.feedback === feedbackType ? null : feedbackType;
        return { ...msg, feedback: newFeedback };
      }
      return msg;
    }));

    toast({
      title: "Thank You",
      description: "Thank you for your feedback!",
    });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    if (limit !== Infinity && usage + selectedModel.cost > limit) {
      alert("Insufficient credits! Please upgrade your plan.");
      return;
    }

    const userMessage = input.trim();
    const newUserMessage: Message = {
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Pravi API klic namesto Mocka
      const aiResponseText = await getRealAIResponse(userMessage, messages);
      
      const newBotMessage: Message = {
        role: "assistant",
        content: aiResponseText,
        timestamp: Date.now(),
      };

      const updatedMessages = [...messages, newUserMessage, newBotMessage];
      setMessages(updatedMessages);
      await saveChatToFirebase(updatedMessages, userMessage);
      const totalMessageLength = userMessage.length + aiResponseText.length;
      await updateUsage(selectedModel.cost, totalMessageLength);
      
    } catch (error) {
      console.error("Chat error:", error);
      toast({ title: "Napaka", description: "Prišlo je do napake pri povezavi z AI.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setIsSidebarOpen(false);
    setLocation("/ai");
  };

  const usagePercent = limit === Infinity ? 0 : Math.min(100, (usage / limit) * 100);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden relative">
      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 w-80 bg-black/80 backdrop-blur-xl z-50 transform transition-transform duration-300 ease-in-out border-r border-white/10 flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full bg-gradient-to-b from-cyan-900/10 via-purple-900/10 to-pink-900/10">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="font-bold text-lg tracking-wider flex items-center gap-2">
              <img src={vaultyLogo} alt="Logo" className="w-6 h-6 object-contain" />
              VAULTY AI
            </h2>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4">
             {contextSubscription === "free" && (
               <div 
                 onClick={() => setLocation("/premium")}
                 className="mb-3 p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 cursor-pointer hover:bg-white/5 transition-all group"
               >
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-cyan-400">UPGRADE TO PRO</span>
                    <Crown size={12} className="text-cyan-400" />
                 </div>
                 <p className="text-xs text-gray-300 group-hover:text-white transition-colors">
                    Get more AI Credits & Models
                 </p>
               </div>
             )}
             <button 
               onClick={handleNewChat}
               className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
             >
               <Sparkles size={18} /> New Chat
             </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-2">
            <p className="text-xs text-gray-500 font-bold tracking-widest mb-2">RECENT</p>
            {recentChats.map(chat => (
              <div
                key={chat.id}
                className="relative overflow-hidden rounded-lg"
                onTouchStart={handleTouchStart}
                onTouchEnd={(e) => handleTouchEnd(e, chat.id)}
              >
                {/* Delete button background - Only visible when swiped */}
                {swipeId === chat.id && (
                  <div className="absolute right-0 top-0 h-full w-16 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center justify-center">
                    <button
                      onClick={() => setDeleteChatId(chat.id)}
                      className="p-2 text-red-400 hover:text-red-300"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}

                {/* Chat item */}
                <div
                  className={cn(
                    "w-full flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all group cursor-pointer relative",
                    swipeId === chat.id ? "translate-x-[-60px]" : "translate-x-0"
                  )}
                  style={{ transition: "transform 0.3s ease-out" }}
                  onClick={() => {
                    if (swipeId !== chat.id) {
                      loadChatHistory(chat.id);
                      setIsSidebarOpen(false);
                    }
                  }}
                >
                  <div className="flex-1 text-left text-sm truncate">
                    {chat.title}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Delete Confirmation Dialog */}
          <Dialog open={!!deleteChatId} onOpenChange={(open) => !open && setDeleteChatId(null)}>
            <DialogContent className="bg-black border border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Delete Chat?</DialogTitle>
                <DialogDescription className="text-gray-300">
                  Are you sure you want to delete this chat? The entire conversation will be lost forever!
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-3">
                <button
                  onClick={() => setDeleteChatId(null)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (deleteChatId) {
                      deleteChat(deleteChatId);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  Delete
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Profile & Memory Section */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            <DropdownMenu open={showMemoryMenu} onOpenChange={setShowMemoryMenu}>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName ?? "User"} className="w-full h-full object-cover" />
                      ) : (
                        <User size={16} className="text-cyan-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white">{user?.displayName || "User"}</p>
                      <p className="text-[10px] text-gray-400">{contextSubscription?.toUpperCase() || 'FREE'}</p>
                    </div>
                  </div>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-black/95 border border-white/10 text-white backdrop-blur-xl">
                <div className="p-4 space-y-4 border-b border-white/10">
                  <div>
                    <p className="text-xs font-bold text-gray-400 mb-2">MEMORY STORAGE</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-300">{memoryUsed.toFixed(2)} GB / {memoryLimit.toFixed(1)} GB</span>
                      </div>
                      <Progress 
                        value={Math.min(100, (memoryUsed / memoryLimit) * 100)} 
                        className="h-2 bg-white/10" 
                        indicatorClassName="bg-gradient-to-r from-purple-500 to-pink-500" 
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 mb-2">MONTHLY CREDITS</p>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-300">${usage.toFixed(2)} / {limit === Infinity ? "∞" : `$${limit}`}</span>
                    </div>
                    <Progress 
                      value={usagePercent} 
                      className="h-2 bg-white/10" 
                      indicatorClassName="bg-gradient-to-r from-cyan-500 to-blue-500" 
                    />
                  </div>
                </div>
                <DropdownMenuItem className="cursor-pointer hover:bg-white/10 focus:bg-white/10 py-3 px-4 text-red-400">
                  <LogOut size={14} className="mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="text-[10px] text-gray-500 text-center">
              {contextSubscription === 'free' ? 'Upgrade to unlock more storage' : `${contextSubscription.toUpperCase()} MEMBER`}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center px-4 justify-between bg-black/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-full">
              <Menu size={24} />
            </button>
            
            {/* Model Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <span className="font-bold text-sm text-white">{selectedModel.name}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-black border border-white/10 text-white">
                {MODELS.map((model) => {
                  const isLocked = model.tier !== "free" && contextSubscription === "free";
                  return (
                    <DropdownMenuItem 
                      key={model.id}
                      disabled={isLocked}
                      onClick={() => setSelectedModel(model)}
                      className={cn(
                        "flex items-center justify-between cursor-pointer focus:bg-white/10 focus:text-white",
                        selectedModel.id === model.id && "bg-cyan-500/20 text-cyan-400"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-gray-500">${model.cost}/msg</span>
                      </div>
                      {isLocked && <Lock size={14} className="text-gray-500" />}
                      {selectedModel.id === model.id && <Check size={14} />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <button onClick={() => setLocation("/")} className="p-2 hover:bg-white/10 rounded-full text-gray-400">
            <X size={24} />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-700">
              <div className="w-32 h-32 mb-8 relative">
                <img 
                  src={vaultyLogo} 
                  alt="Vaulty AI" 
                  className="w-full h-full object-contain relative z-10"
                />
              </div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 text-white">VAULTY AI</h1>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-4 max-w-3xl mx-auto",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden",
                  msg.role === "user" ? "bg-white/10" : "bg-transparent"
                )}>
                  {msg.role === "user" ? <User size={16} /> : <img src={botAvatar} className="w-full h-full object-cover" alt="AI" />}
                </div>
                <div className={cn(
                  "p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed group relative",
                  msg.role === "user" 
                    ? "bg-white text-black rounded-tr-sm" 
                    : "bg-white/5 border border-white/10 rounded-tl-sm"
                )}>
                  {msg.content}
                  
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 transition-opacity">
                      <button 
                        onClick={() => handleCopyMessage(msg.content)}
                        className="text-gray-500 hover:text-white transition-colors p-1"
                        title="Copy"
                      >
                        <Copy size={14} />
                      </button>
                      <button 
                        onClick={() => handleSpeakMessage(msg.content)}
                        className="text-gray-500 hover:text-white transition-colors p-1"
                        title="Read Aloud"
                      >
                        <Volume2 size={14} />
                      </button>
                      <div className="w-px h-3 bg-white/10 mx-1" />
                      <button 
                        onClick={() => handleFeedback(idx, true)}
                        className={cn(
                          "transition-colors p-1",
                          msg.feedback === "positive" ? "text-cyan-400" : "text-gray-500 hover:text-green-400"
                        )}
                        title="Good Response"
                      >
                        <ThumbsUp size={14} className={cn(msg.feedback === "positive" && "fill-current")} />
                      </button>
                      <button 
                        onClick={() => handleFeedback(idx, false)}
                        className={cn(
                          "transition-colors p-1",
                          msg.feedback === "negative" ? "text-red-500" : "text-gray-500 hover:text-red-400"
                        )}
                        title="Bad Response"
                      >
                        <ThumbsDown size={14} className={cn(msg.feedback === "negative" && "fill-current")} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-4 max-w-3xl mx-auto">
               <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                 <img src={botAvatar} className="w-full h-full object-cover" alt="AI" />
               </div>
               <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 flex items-center gap-1">
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Glass Style Like Bottom Bar */}
        <div className="p-4 bg-transparent backdrop-blur-sm z-20 border-t border-white/5">
          <div className="max-w-3xl mx-auto">
            <div
              className="glass-card rounded-3xl p-1.5 relative flex items-end gap-2 group"
              style={{
                boxShadow: "0 0 40px -10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1)",
                background: "rgba(15, 15, 15, 0.7)",
                backdropFilter: "blur(20px)"
              }}
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5 opacity-50 blur-xl -z-10" />
              
              {/* Attachment Button - White Icon */}
              <button 
                className="p-3 rounded-full hover:bg-white/10 text-white hover:text-white transition-colors flex-shrink-0"
                title="Attach file"
              >
                <Paperclip size={20} />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={`Message ${selectedModel.name}...`}
                className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none text-white placeholder-gray-400 py-3 px-2 max-h-32 overflow-y-auto resize-none"
                disabled={isLoading}
              />
              
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-3 rounded-full transition-all flex items-center justify-center flex-shrink-0",
                  input.trim() && !isLoading
                    ? "bg-white text-black hover:bg-gray-100 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    : "bg-white/10 text-gray-400 cursor-not-allowed"
                )}
              >
                <Send size={20} />
              </button>
            </div>
            
            <p className="text-center text-[10px] text-gray-500 mt-3 font-medium tracking-wide">
              AI can occasionally make mistakes. Consider verifying important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
