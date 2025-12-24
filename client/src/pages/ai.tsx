import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { 
  Send, X, Settings, History, Copy, Check, ThumbsUp, ThumbsDown, 
  Volume2, Menu, User, CreditCard, Crown, Sparkles, ChevronLeft,
  Paperclip, ChevronDown, Lock, Zap, HardDrive, LogOut, TrendingUp, DollarSign, Wallet
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

// Note: Keeping your asset imports but adding fallbacks for the demo environment
const botAvatar = "https://api.dicebear.com/7.x/bottts/svg?seed=vaulty"; 
const vaultyLogo = "https://api.dicebear.com/7.x/shapes/svg?seed=vaulty";

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
  free: 0.1,      // 0.1 GB = 100 MB
  pro: 1,         // 1 GB
  ultra: 5,       // 5 GB
  max: 20         // 20 GB
};

const apiKey = "AIzaSyBtRKYnFv7YvPjwEM9mcbl9oY0BpjCH5IU";
const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app-id';

// Helper to format text with basic markdown-like syntax
const formatMessageContent = (content: string) => {
  if (!content) return null;
  
  // Replace headers
  let formatted = content
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');

  // Replace bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  
  // Replace italic
  formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // Replace bullet points
  formatted = formatted.replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>');

  // Handle new lines
  return formatted.split('\n').map((line, i) => (
    <span key={i} dangerouslySetInnerHTML={{ __html: line }} className="block" />
  ));
};

const SUGGESTIONS = [
  { text: "Tell me more about Bitcoin", icon: <TrendingUp size={16} /> },
  { text: "How does inflation affect my savings?", icon: <DollarSign size={16} /> },
  { text: "Explain Ethereum Layer 2 solutions", icon: <Wallet size={16} /> },
  { text: "What are the basics of stock market?", icon: <TrendingUp size={16} /> },
];

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

  const getRealAIResponse = async (message: string, history: Message[]) => {
    // UPDATED SYSTEM PROMPT: Enforce finance/crypto specialization
    const systemPrompt = `You are Vaulty AI, a world-class financial and cryptocurrency expert assistant. 
    1. Your primary expertise is in markets, investing, crypto, personal finance, and economics.
    2. You MUST ONLY provide information related to these topics.
    3. If a user asks about general topics (weather, cooking, sports, celebrities, etc.), you must politely reply: "I am Vaulty AI, a specialized financial assistant. I only provide insights on finance and crypto markets, so I cannot help with that request."
    4. Keep your responses structured, professional, and helpful. Use markdown formatting like **bold** for emphasis and ### for sections.`;
    
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
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "I am sorry, I couldn't generate a response.";
    };

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
    return "Error: Could not connect to AI services.";
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
  }, [messages, isLoading]);

  useEffect(() => {
    const tier = contextSubscription || "free";
    setLimit(LIMITS[tier]);
    setMemoryLimit(MEMORY_LIMITS[tier]);
  }, [contextSubscription]);

  const loadUsage = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "artifacts", appId, "users", user.uid, "features", "ai_usage");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUsage(docSnap.data().used || 0);
        setMemoryUsed(docSnap.data().memoryUsed || 0);
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
      toast({ title: "Failed to delete chat", variant: "destructive" });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent, chatId: string) => {
    setTouchEnd(e.changedTouches[0].clientX);
    const distance = touchStart - e.changedTouches[0].clientX;
    if (distance > 50) setSwipeId(chatId);
    else if (distance < -50) setSwipeId(null);
  };

  const loadRecentChats = async () => {
    if (!user) return;
    try {
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
    if (!user) return;
    try {
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
    if (!user) return;
    try {
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
    toast({ title: "Copied", description: "Message copied to clipboard" });
  };

  const handleSpeakMessage = (content: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(content);
      window.speechSynthesis.speak(utterance);
    } else {
      toast({ title: "Error", description: "TTS not supported", variant: "destructive" });
    }
  };

  const handleFeedback = (index: number, isPositive: boolean) => {
    const feedbackType = isPositive ? "positive" : "negative";
    setMessages(prev => prev.map((msg, i) => {
      if (i === index) return { ...msg, feedback: msg.feedback === feedbackType ? null : feedbackType };
      return msg;
    }));
    toast({ title: "Feedback Received", description: "Thanks for helping us improve!" });
  };

  const handleSendMessage = async (textOverride?: string) => {
    const content = textOverride || input;
    if (!content.trim() || isLoading) return;
    
    if (limit !== Infinity && usage + selectedModel.cost > limit) {
      toast({ title: "Credits Exhausted", description: "Please upgrade your plan to continue.", variant: "destructive" });
      return;
    }

    const userMessage: Message = { role: "user", content: content.trim(), timestamp: Date.now() };
    const historyForApi = [...messages];
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const aiResponseText = await getRealAIResponse(userMessage.content, historyForApi);
      const newBotMessage: Message = { role: "assistant", content: aiResponseText, timestamp: Date.now() };
      const updatedMessages = [...historyForApi, userMessage, newBotMessage];
      setMessages(updatedMessages);
      await saveChatToFirebase(updatedMessages, userMessage.content);
      await updateUsage(selectedModel.cost, userMessage.content.length + aiResponseText.length);
    } catch (error) {
      toast({ title: "Connection Error", description: "Failed to reach AI. Check your connection.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setIsSidebarOpen(false);
  };

  const usagePercent = limit === Infinity ? 0 : Math.min(100, (usage / limit) * 100);

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans">
      {/* Sidebar - Remains original logic with CSS fix */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 w-80 bg-black z-50 transform transition-transform duration-300 ease-in-out border-r border-white/10 flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full bg-gradient-to-b from-cyan-950/20 to-black">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="font-bold text-lg tracking-wider flex items-center gap-2">
              <img src={vaultyLogo} alt="Logo" className="w-6 h-6 object-contain" />
              VAULTY AI
            </h2>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4">
             {contextSubscription === "free" && (
               <div 
                 onClick={() => setLocation("/premium")}
                 className="mb-3 p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 cursor-pointer hover:bg-cyan-500/20 transition-all group"
               >
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-cyan-400">UPGRADE TO PRO</span>
                    <Crown size={12} className="text-cyan-400" />
                 </div>
                 <p className="text-xs text-gray-400 group-hover:text-white transition-colors">
                   Get more AI Credits & Models
                 </p>
               </div>
             )}
             <button 
               onClick={handleNewChat}
               className="w-full py-3 px-4 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
             >
               <Sparkles size={18} /> New Chat
             </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-20">
            <p className="text-[10px] text-gray-500 font-bold tracking-widest mb-2 px-1">RECENT CONVERSATIONS</p>
            {recentChats.map(chat => (
              <div
                key={chat.id}
                className="relative overflow-hidden rounded-lg group"
                onTouchStart={handleTouchStart}
                onTouchEnd={(e) => handleTouchEnd(e, chat.id)}
              >
                {swipeId === chat.id && (
                  <div className="absolute right-0 top-0 h-full w-16 bg-red-600 flex items-center justify-center z-10">
                    <button onClick={() => setDeleteChatId(chat.id)} className="p-2 text-white"><X size={18} /></button>
                  </div>
                )}
                <div
                  className={cn(
                    "w-full flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer",
                    swipeId === chat.id ? "-translate-x-16" : "translate-x-0"
                  )}
                  onClick={() => {
                    if (swipeId !== chat.id) {
                      loadChatHistory(chat.id);
                      setIsSidebarOpen(false);
                    }
                  }}
                >
                  <History size={14} className="text-gray-500 flex-shrink-0" />
                  <div className="flex-1 text-left text-sm truncate text-gray-300 group-hover:text-white">
                    {chat.title}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-white/10 bg-black/40">
            <DropdownMenu open={showMemoryMenu} onOpenChange={setShowMemoryMenu}>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-600/30 flex items-center justify-center overflow-hidden">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                      ) : (
                        <User size={16} className="text-cyan-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white leading-none mb-1">{user?.displayName || "Member"}</p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-tighter">{contextSubscription || 'Standard'}</p>
                    </div>
                  </div>
                  <ChevronDown size={14} className="text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-[#0a0a0a] border border-white/10 text-white backdrop-blur-2xl p-4 shadow-2xl">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-2 uppercase">
                      <span>Memory Usage</span>
                      <span>{(memoryUsed * 1024).toFixed(0)} MB / {(memoryLimit * 1024).toFixed(0)} MB</span>
                    </div>
                    <Progress value={(memoryUsed / memoryLimit) * 100} className="h-1.5 bg-white/5" indicatorClassName="bg-cyan-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-2 uppercase">
                      <span>Monthly Credits</span>
                      <span>${usage.toFixed(2)} / {limit === Infinity ? "∞" : `$${limit}`}</span>
                    </div>
                    <Progress value={usagePercent} className="h-1.5 bg-white/5" indicatorClassName="bg-purple-500" />
                  </div>
                  <DropdownMenuItem onClick={() => getAuth().signOut()} className="mt-4 p-2 text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer rounded-lg">
                    <LogOut size={14} className="mr-2" /> Sign Out
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col w-full relative h-full">
        {/* FIXED HEADER */}
        <header className="h-16 border-b border-white/5 flex items-center px-4 justify-between bg-black/60 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <Menu size={20} />
            </button>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors border border-transparent active:border-white/10">
                  <span className="font-bold text-xs text-white uppercase tracking-wider">{selectedModel.name}</span>
                  <ChevronDown size={12} className="text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-black border border-white/10 text-white shadow-2xl">
                {MODELS.map((model) => {
                  const isLocked = model.tier !== "free" && contextSubscription === "free";
                  return (
                    <DropdownMenuItem 
                      key={model.id}
                      disabled={isLocked}
                      onClick={() => setSelectedModel(model)}
                      className={cn(
                        "flex items-center justify-between p-3 cursor-pointer focus:bg-white/5",
                        selectedModel.id === model.id && "bg-cyan-500/10 text-cyan-400"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{model.name}</span>
                        <span className="text-[10px] text-gray-500">${model.cost.toFixed(2)} / message</span>
                      </div>
                      {isLocked ? <Lock size={12} className="text-gray-600" /> : selectedModel.id === model.id && <Check size={14} />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <button onClick={() => setLocation("/")} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </header>

        {/* MESSAGE AREA - FLEX-1 with AUTO SCROLL */}
        <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 scroll-smooth">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 mb-6 relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full" />
                <img src={vaultyLogo} alt="Vaulty AI" className="w-full h-full object-contain relative z-10 animate-pulse" />
              </div>
              <h1 className="text-3xl font-black tracking-tight mb-2 text-white">VAULTY AI</h1>
              <p className="text-gray-400 text-sm max-w-sm mb-8">
                Your specialized companion for finance, markets, and crypto.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(s.text)}
                    className="p-4 text-left bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-3 group"
                  >
                    <div className="p-2 rounded-lg bg-black group-hover:bg-cyan-500/20 text-gray-400 group-hover:text-cyan-400 transition-colors">
                      {s.icon}
                    </div>
                    <span className="text-xs font-medium text-gray-300 group-hover:text-white">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8">
              {messages.map((msg, idx) => (
                <div key={idx} className={cn("flex gap-4 group", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden border border-white/10",
                    msg.role === "user" ? "bg-white/10" : "bg-black"
                  )}>
                    {msg.role === "user" ? <User size={14} /> : <img src={botAvatar} className="w-full h-full object-cover" alt="AI" />}
                  </div>
                  <div className={cn(
                    "relative p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user" 
                      ? "bg-white text-black font-medium" 
                      : "bg-[#111] border border-white/5 text-gray-300"
                  )}>
                    {msg.role === "assistant" ? formatMessageContent(msg.content) : msg.content}
                    
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleCopyMessage(msg.content)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all"><Copy size={12} /></button>
                        <button onClick={() => handleSpeakMessage(msg.content)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all"><Volume2 size={12} /></button>
                        <div className="flex-1" />
                        <button onClick={() => handleFeedback(idx, true)} className={cn("p-1.5 rounded-lg transition-all", msg.feedback === "positive" ? "text-cyan-400 bg-cyan-400/10" : "text-gray-500 hover:text-cyan-400")}><ThumbsUp size={12} className={cn(msg.feedback === "positive" && "fill-current")} /></button>
                        <button onClick={() => handleFeedback(idx, false)} className={cn("p-1.5 rounded-lg transition-all", msg.feedback === "negative" ? "text-red-500 bg-red-500/10" : "text-gray-500 hover:text-red-400")}><ThumbsDown size={12} className={cn(msg.feedback === "negative" && "fill-current")} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-black border border-white/10 flex items-center justify-center overflow-hidden">
                    <img src={botAvatar} className="w-full h-full object-cover" alt="AI" />
                  </div>
                  <div className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* STICKY INPUT AREA */}
        <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent sticky bottom-0 z-40">
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#151515] border border-white/10 rounded-[28px] p-2 flex items-end gap-2 shadow-2xl focus-within:border-white/20 transition-all">
              <button className="p-3 text-gray-500 hover:text-white transition-colors" title="Attach context">
                <Paperclip size={20} />
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Ask ${selectedModel.name.split(' ')[0]} about markets...`}
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-white placeholder-gray-600 py-3 px-1 max-h-40 min-h-[44px] overflow-y-auto resize-none text-sm leading-relaxed"
                rows={1}
                disabled={isLoading}
              />
              
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-3 rounded-full transition-all flex items-center justify-center flex-shrink-0 mb-0.5",
                  input.trim() && !isLoading
                    ? "bg-white text-black hover:scale-105 active:scale-95"
                    : "bg-white/5 text-gray-700 cursor-not-allowed"
                )}
              >
                <Send size={18} />
              </button>
            </div>
            
            <p className="text-center text-[9px] text-gray-600 mt-3 font-medium tracking-wide uppercase">
              Financial Assistant • AI can provide inaccurate market data
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteChatId} onOpenChange={(o) => !o && setDeleteChatId(null)}>
        <DialogContent className="bg-black border border-white/10 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription className="text-gray-500">
              This action cannot be undone. All messages in this thread will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={() => setDeleteChatId(null)} className="rounded-xl border border-white/10">Keep</Button>
            <Button variant="destructive" onClick={() => deleteChatId && deleteChat(deleteChatId)} className="rounded-xl bg-red-600 hover:bg-red-700">Delete Forever</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}