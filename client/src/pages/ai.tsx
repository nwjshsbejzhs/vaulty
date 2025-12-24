import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { 
  Send, X, Settings, History, Copy, Check, ThumbsUp, ThumbsDown, 
  Volume2, Menu, User, CreditCard, Crown, Sparkles, ChevronLeft,
  Paperclip, ChevronDown, Lock, Zap, HardDrive, LogOut, TrendingUp, Wallet, Landmark
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
  free: 0.1,      // 0.1 GB = 100 MB
  pro: 1,         // 1 GB
  ultra: 5,       // 5 GB
  max: 20         // 20 GB
};

const apiKey = "AIzaSyBtRKYnFv7YvPjwEM9mcbl9oY0BpjCH5IU";
const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app-id';

// Helper for formatting markdown-like syntax
const formatContent = (text: string) => {
  if (!text) return null;
  
  // Headers
  let formatted = text
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-white">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2 text-white">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2 text-white">$1</h1>');

  // Bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  
  // Italic
  formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // New lines to spans
  return formatted.split('\n').map((line, i) => (
    <span key={i} dangerouslySetInnerHTML={{ __html: line }} className="block min-h-[1em]" />
  ));
};

const SUGGESTIONS = [
  { text: "Tell me more about Bitcoin", icon: <TrendingUp size={16} /> },
  { text: "How can I start investing with $100?", icon: <Wallet size={16} /> },
  { text: "Explain what an ETF is", icon: <Landmark size={16} /> },
  { text: "Current crypto market trends", icon: <Zap size={16} /> },
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
    // UPDATED: Strict Finance/Crypto System Prompt
    const systemPrompt = `You are Vaulty AI, a specialized assistant for Finance and Cryptocurrency.
    - You ONLY answer questions related to finance, investing, stock markets, crypto, personal budget, and economy.
    - If the user asks about anything else (weather, jokes, general knowledge, cooking, etc.), you MUST answer: "I am Vaulty AI, a specialized financial assistant. I don't provide information on general topics."
    - Be professional, accurate, and structured.
    - Use Markdown: **bold** for key terms, ### for headers.`;
    
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
      console.error("Error deleting chat:", e);
      toast({ title: "Failed to delete chat", variant: "destructive" });
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

  const handleSendMessage = async (customInput?: string) => {
    const textToSend = customInput || input;
    if (!textToSend.trim() || isLoading) return;
    
    if (limit !== Infinity && usage + selectedModel.cost > limit) {
      toast({ title: "Upgrade Required", description: "You've reached your credit limit.", variant: "destructive" });
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: textToSend.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const aiResponseText = await getRealAIResponse(userMessage.content, messages);
      
      const newBotMessage: Message = {
        role: "assistant",
        content: aiResponseText,
        timestamp: Date.now(),
      };

      const finalMessages = [...newMessages, newBotMessage];
      setMessages(finalMessages);
      await saveChatToFirebase(finalMessages, userMessage.content);
      await updateUsage(selectedModel.cost, userMessage.content.length + aiResponseText.length);
      
    } catch (error) {
      console.error("Chat error:", error);
      toast({ title: "Napaka", description: "Prišlo je do napake pri povezavi z AI.", variant: "destructive" });
    } finally {
      setIsLoading(false);
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

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden relative font-sans">
      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 w-80 bg-black/95 backdrop-blur-2xl z-50 transform transition-transform duration-300 ease-in-out border-r border-white/10 flex flex-col shadow-2xl",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full bg-gradient-to-b from-cyan-900/10 via-black to-black">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="font-bold text-lg tracking-widest flex items-center gap-2">
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
                 className="mb-3 p-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-white/5 cursor-pointer hover:bg-white/5 transition-all group"
               >
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-tighter">Premium Access</span>
                    <Crown size={12} className="text-cyan-400" />
                 </div>
                 <p className="text-xs text-gray-400 group-hover:text-white transition-colors">
                   Get Unlimited Credits & Pro Models
                 </p>
               </div>
             )}
             <button 
               onClick={() => { setMessages([]); setCurrentChatId(null); setIsSidebarOpen(false); }}
               className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
             >
               <Sparkles size={16} /> New Chat
             </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-1">
            <p className="text-[10px] text-gray-500 font-bold tracking-widest mb-3 px-2 uppercase">Recent Activity</p>
            {recentChats.map(chat => (
              <div
                key={chat.id}
                className="group relative flex items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => { loadChatHistory(chat.id); setIsSidebarOpen(false); }}
              >
                <History size={14} className="text-gray-600 group-hover:text-cyan-400 transition-colors" />
                <div className="flex-1 text-xs truncate text-gray-400 group-hover:text-white">
                  {chat.title}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setDeleteChatId(chat.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-white/10">
            <div className="bg-white/5 p-4 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cyan-600/20 flex items-center justify-center border border-cyan-500/20">
                   <User size={18} className="text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-none mb-1">{user?.displayName || "Member"}</p>
                  <p className="text-[9px] text-cyan-500 font-black uppercase tracking-widest">{contextSubscription || 'Standard'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1.5 uppercase">
                    <span>Usage</span>
                    <span>${usage.toFixed(2)} / ${limit === Infinity ? "∞" : limit}</span>
                  </div>
                  <Progress value={usagePercent} className="h-1 bg-white/5" indicatorClassName="bg-cyan-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full bg-black">
        {/* Fixed Header */}
        <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center px-4 justify-between bg-black/50 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 hover:bg-white/5 rounded-xl transition-all border border-transparent active:border-white/10">
              <Menu size={20} />
            </button>
            <div className="h-6 w-px bg-white/10 mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all text-gray-300">
                  <span className="font-bold text-xs uppercase tracking-widest">{selectedModel.name}</span>
                  <ChevronDown size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-black border border-white/10 text-white">
                {MODELS.map((model) => (
                  <DropdownMenuItem 
                    key={model.id}
                    onClick={() => setSelectedModel(model)}
                    className={cn(
                      "flex items-center justify-between p-3 cursor-pointer",
                      selectedModel.id === model.id && "bg-cyan-500/10 text-cyan-400"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{model.name}</span>
                      <span className="text-[10px] text-gray-500">${model.cost.toFixed(2)} / msg</span>
                    </div>
                    {selectedModel.id === model.id && <Check size={14} />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <button onClick={() => setLocation("/")} className="p-2 hover:bg-white/5 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </header>

        {/* Message View - Flex Grow & Auto Scroll */}
        <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 scroll-smooth scrollbar-hide">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
              <div className="w-24 h-24 mb-6 p-2 bg-white/5 rounded-[40px] border border-white/5 shadow-2xl">
                <img src={vaultyLogo} alt="Vaulty AI" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter mb-4 text-white uppercase italic">Vaulty AI</h1>
              <p className="text-gray-500 text-sm max-w-sm mb-12">
                Expert financial intelligence for markets, crypto, and investment strategies.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(s.text)}
                    className="p-4 text-left bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.08] hover:border-white/20 transition-all flex items-center gap-4 group"
                  >
                    <div className="p-2 rounded-xl bg-black border border-white/5 text-gray-500 group-hover:text-cyan-400 transition-colors">
                      {s.icon}
                    </div>
                    <span className="text-xs font-bold text-gray-300 group-hover:text-white leading-tight">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-10">
              {messages.map((msg, idx) => (
                <div key={idx} className={cn("flex gap-4", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn(
                    "w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 border",
                    msg.role === "user" ? "bg-white/10 border-white/10" : "bg-black border-white/5 shadow-xl"
                  )}>
                    {msg.role === "user" ? <User size={16} /> : <img src={botAvatar} className="w-full h-full object-cover" alt="AI" />}
                  </div>
                  <div className={cn(
                    "relative p-5 rounded-3xl text-sm leading-relaxed",
                    msg.role === "user" 
                      ? "bg-white text-black font-semibold shadow-2xl" 
                      : "bg-[#0c0c0c] border border-white/5 text-gray-300"
                  )}>
                    {msg.role === "assistant" ? formatContent(msg.content) : msg.content}
                    
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                        <button onClick={() => handleCopyMessage(msg.content)} className="p-1 hover:text-white transition-colors"><Copy size={13} /></button>
                        <button className="p-1 hover:text-white transition-colors"><Volume2 size={13} /></button>
                        <div className="flex-1" />
                        <button className="p-1 hover:text-cyan-400 transition-colors"><ThumbsUp size={13} /></button>
                        <button className="p-1 hover:text-red-500 transition-colors"><ThumbsDown size={13} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-black border border-white/5 flex items-center justify-center shadow-xl">
                    <img src={botAvatar} className="w-full h-full object-cover" alt="AI" />
                  </div>
                  <div className="bg-[#0c0c0c] border border-white/5 rounded-3xl p-5 flex items-center gap-1.5 shadow-2xl">
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

        {/* Fixed Input Area - STICKY TO BOTTOM */}
        <div className="p-4 bg-gradient-to-t from-black via-black to-transparent flex-shrink-0 sticky bottom-0 z-40 pb-6">
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#111] border border-white/10 rounded-[32px] p-2 flex items-end gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] focus-within:border-white/20 transition-all">
              <button className="p-3.5 text-gray-500 hover:text-white transition-colors" title="Attach context">
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
                placeholder="Ask Vaulty about finance or crypto..."
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-white placeholder-gray-600 py-3.5 px-1 max-h-40 min-h-[48px] overflow-y-auto resize-none text-sm font-medium leading-relaxed"
                rows={1}
                disabled={isLoading}
              />
              
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-3.5 rounded-full transition-all flex items-center justify-center flex-shrink-0 mb-0.5 shadow-xl",
                  input.trim() && !isLoading
                    ? "bg-white text-black hover:scale-105 active:scale-95"
                    : "bg-white/5 text-gray-700 cursor-not-allowed"
                )}
              >
                <Send size={18} />
              </button>
            </div>
            
            <p className="text-center text-[9px] text-gray-600 mt-4 font-black tracking-[0.2em] uppercase">
              Financial Intelligence Unit • Vaulty 1.5 Pro
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteChatId} onOpenChange={(open) => !open && setDeleteChatId(null)}>
        <DialogContent className="bg-black border border-white/10 text-white rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tighter italic">Delete Conversation?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This will permanently remove the conversation and its analysis from your history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="ghost" onClick={() => setDeleteChatId(null)} className="rounded-xl border border-white/5">Keep it</Button>
            <Button variant="destructive" onClick={() => deleteChatId && deleteChat(deleteChatId)} className="rounded-xl bg-red-600 hover:bg-red-700">Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}