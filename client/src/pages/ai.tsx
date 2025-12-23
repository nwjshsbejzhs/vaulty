import { useState, useEffect, useRef } from "react";
import { 
  Send, X, Settings, History, Copy, Check, ThumbsUp, ThumbsDown, 
  Volume2, Menu, User, CreditCard, Crown, Sparkles, ChevronLeft,
  Paperclip, ChevronDown, Lock, Zap, HardDrive, LogOut
} from "lucide-react";

// Firebase uvozi iz uradnih virov (namesto lokalnega @/lib/firebase)
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithCustomToken, 
  signInAnonymously,
  signOut 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  getDocs, 
  setDoc, 
  increment, 
  deleteDoc,
  onSnapshot
} from "firebase/firestore";

/**
 * OPOMBA: Ker lokalni uvozi (@/...) povzročajo napake v tem okolju, 
 * sem jih nadomestil z delujočimi definicijami spodaj. 
 * Ko kodo kopirate v svoj projekt, lahko vrnete svoje originalne uvoze.
 */

// Globalne spremenljivke okolja
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app-id';
const apiKey = "AIzaSyBtRKYnFv7YvPjwEM9mcbl9oY0BpjCH5IU"; // Ključ se vbrizga samodejno

// Simulacija cn funkcije (namesto @/lib/utils)
const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

// Simulacija UI komponent (namesto @/components/ui/...)
const Progress = ({ value, className, indicatorClassName }: any) => (
  <div className={cn("relative w-full overflow-hidden rounded-full bg-white/10 h-2", className)}>
    <div 
      className={cn("h-full transition-all duration-500", indicatorClassName)} 
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }} 
    />
  </div>
);

// Placeholderji za slike (namesto @assets/...)
const botAvatar = "https://api.dicebear.com/7.x/bottts/svg?seed=VaultyAI";
const vaultyLogo = "https://api.dicebear.com/7.x/shapes/svg?seed=VaultyLogo";

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

export default function App() {
  const [user, setUser] = useState<any>(null);
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
  
  const [subscription, setSubscription] = useState("free");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Avtentikacija
  useEffect(() => {
    const initAuth = async () => {
      if (typeof (window as any).__initial_auth_token !== 'undefined' && (window as any).__initial_auth_token) {
        await signInWithCustomToken(auth, (window as any).__initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Sinhronizacija s Firestore
  useEffect(() => {
    if (!user) return;

    const chatsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'chatHistories');
    const unsubChats = onSnapshot(chatsRef, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatHistory));
      setRecentChats(chats.sort((a, b) => b.updatedAt - a.updatedAt));
    });

    const usageRef = doc(db, 'artifacts', appId, 'users', user.uid, 'features', 'ai_usage');
    const unsubUsage = onSnapshot(usageRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUsage(data.used || 0);
        setMemoryUsed(data.memoryUsed || 0);
        if (data.tier) setSubscription(data.tier);
      }
    });

    return () => { unsubChats(); unsubUsage(); };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    setLimit(LIMITS[subscription] || 10);
    setMemoryLimit(MEMORY_LIMITS[subscription] || 0.1);
  }, [subscription]);

  // Realen Gemini API klic
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
              ...history.slice(-6).map(m => ({
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
      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "Na žalost nisem mogel generirati odgovora.";
    };

    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        return await apiCall();
      } catch (err) {
        if (i === 4) throw err;
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
    return "Error: Could not connect to AI.";
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;
    
    if (limit !== Infinity && usage + selectedModel.cost > limit) {
      alert("Nimaš dovolj kreditov! Nadgradi svoj paket.");
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
      const aiResponseText = await getRealAIResponse(userMessage, messages);
      
      const newBotMessage: Message = {
        role: "assistant",
        content: aiResponseText,
        timestamp: Date.now(),
      };

      const updatedMessages = [...messages, newUserMessage, newBotMessage];
      setMessages(updatedMessages);
      
      // Shranjevanje v Firebase po Rule 1
      const chatTitle = userMessage.slice(0, 30) + "...";
      if (currentChatId) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'chatHistories', currentChatId), {
          messages: updatedMessages,
          updatedAt: Date.now(),
        });
      } else {
        const newDoc = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'chatHistories'), {
          title: chatTitle,
          messages: updatedMessages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setCurrentChatId(newDoc.id);
      }

      const totalLen = userMessage.length + aiResponseText.length;
      const memUsedByMessage = totalLen / (1024 * 1024 * 1024);
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'features', 'ai_usage'), { 
        used: increment(selectedModel.cost),
        memoryUsed: increment(memUsedByMessage),
        lastUpdated: Date.now()
      }, { merge: true });
      
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'chatHistories', id));
    if (currentChatId === id) {
      setMessages([]);
      setCurrentChatId(null);
    }
    setDeleteChatId(null);
  };

  const handleCopyMessage = (content: string) => {
    const el = document.createElement('textarea');
    el.value = content;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

  const usagePercent = limit === Infinity ? 0 : Math.min(100, (usage / limit) * 100);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden relative">
      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 w-80 bg-black/80 backdrop-blur-xl z-50 transform transition-transform duration-300 ease-in-out border-r border-white/10 flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:static"
        )}
      >
        <div className="flex flex-col h-full bg-gradient-to-b from-cyan-900/10 via-purple-900/10 to-pink-900/10">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="font-bold text-lg tracking-wider flex items-center gap-2">
              <img src={vaultyLogo} alt="Logo" className="w-6 h-6 object-contain" />
              VAULTY AI
            </h2>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full lg:hidden">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4">
             {subscription === "free" && (
               <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 cursor-pointer hover:bg-white/5 transition-all group">
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-cyan-400">UPGRADE TO PRO</span>
                    <Crown size={12} className="text-cyan-400" />
                 </div>
                 <p className="text-xs text-gray-300 group-hover:text-white transition-colors">Get more AI Credits & Models</p>
               </div>
             )}
             <button 
               onClick={() => { setMessages([]); setCurrentChatId(null); setIsSidebarOpen(false); }}
               className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
             >
               <Sparkles size={18} /> New Chat
             </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-2">
            <p className="text-xs text-gray-500 font-bold tracking-widest mb-2 uppercase">Recent</p>
            {recentChats.map(chat => (
              <div key={chat.id} className="relative group">
                <div
                  className={cn(
                    "w-full flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent transition-all cursor-pointer relative truncate text-sm",
                    currentChatId === chat.id && "bg-white/10 border-white/10"
                  )}
                  onClick={() => {
                    setMessages(chat.messages || []);
                    setCurrentChatId(chat.id);
                    setIsSidebarOpen(false);
                  }}
                >
                  <span className="flex-1 truncate">{chat.title}</span>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteChatId(chat.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Profile Section */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            <button onClick={() => setShowMemoryMenu(!showMemoryMenu)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center overflow-hidden">
                  <User size={16} className="text-cyan-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white truncate w-32">{user?.displayName || 'Vaulty User'}</p>
                  <p className="text-[10px] text-gray-400 uppercase">{subscription}</p>
                </div>
              </div>
              <ChevronDown size={16} className={cn("text-gray-400 transition-transform", showMemoryMenu && "rotate-180")} />
            </button>

            {showMemoryMenu && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl mb-3 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">Memory Storage</p>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span>{memoryUsed.toFixed(2)} GB / {memoryLimit.toFixed(1)} GB</span>
                  </div>
                  <Progress value={(memoryUsed / memoryLimit) * 100} indicatorClassName="bg-gradient-to-r from-purple-500 to-pink-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">Monthly Credits</p>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span>${usage.toFixed(2)} / ${limit === Infinity ? "∞" : limit}</span>
                  </div>
                  <Progress value={usagePercent} indicatorClassName="bg-gradient-to-r from-cyan-500 to-blue-500" />
                </div>
                <button onClick={() => signOut(auth)} className="w-full flex items-center gap-2 p-2 hover:bg-red-500/10 text-red-400 rounded-lg text-xs transition-colors">
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
            <div className="text-[10px] text-gray-500 text-center tracking-widest">VAULTY AI v1.5</div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col w-full min-w-0 bg-[#050505] relative">
        <header className="h-16 border-b border-white/10 flex items-center px-4 justify-between bg-black/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-full lg:hidden">
              <Menu size={24} />
            </button>
            <div className="relative group">
               <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                  <span className="font-bold text-sm text-white">{selectedModel.name}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
            </div>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full text-gray-400"><X size={24} /></button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-700">
              <div className="w-32 h-32 mb-8 relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full" />
                <img src={vaultyLogo} alt="Vaulty AI" className="relative w-full h-full object-contain" />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white mb-2 uppercase">Vaulty AI</h1>
              <p className="text-gray-500 max-w-xs text-sm">Vaš vrhunski inteligentni pomočnik za delo, programiranje in ustvarjanje.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={cn("flex gap-4", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden",
                    msg.role === "user" ? "bg-white/10" : "bg-gradient-to-br from-cyan-500 to-blue-600"
                  )}>
                    {msg.role === "user" ? <User size={16} /> : <Zap size={16} className="text-white" />}
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl max-w-[85%] text-[15px] leading-relaxed relative group shadow-sm",
                    msg.role === "user" 
                      ? "bg-white text-black rounded-tr-sm font-medium" 
                      : "bg-[#111] border border-white/5 text-gray-200 rounded-tl-sm"
                  )}>
                    {msg.content}
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleCopyMessage(msg.content)} className="text-gray-500 hover:text-white transition-colors p-1"><Copy size={14} /></button>
                        <button className="text-gray-500 hover:text-white transition-colors p-1"><Volume2 size={14} /></button>
                        <div className="w-px h-3 bg-white/10 mx-1" />
                        <button onClick={() => handleFeedback(idx, true)} className={cn("p-1 transition-colors", msg.feedback === "positive" ? "text-cyan-400" : "text-gray-500 hover:text-cyan-400")}><ThumbsUp size={14} /></button>
                        <button onClick={() => handleFeedback(idx, false)} className={cn("p-1 transition-colors", msg.feedback === "negative" ? "text-red-500" : "text-gray-500 hover:text-red-400")}><ThumbsDown size={14} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 max-w-3xl mx-auto">
                   <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mt-1">
                    <Loader2 size={16} className="text-white animate-spin" />
                  </div>
                   <div className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-transparent backdrop-blur-sm z-20 border-t border-white/5">
          <div className="max-w-3xl mx-auto">
            <div 
              className="rounded-3xl p-1.5 relative flex items-end gap-2 group transition-all"
              style={{ background: "rgba(18, 18, 18, 0.8)", backdropFilter: "blur(20px)", boxShadow: "0 0 40px -10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)" }}
            >
              <button className="p-3 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors flex-shrink-0"><Paperclip size={20} /></button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder={`Vprašaj ${selectedModel.name}...`}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 py-3 px-2 max-h-48 overflow-y-auto resize-none scrollbar-hide text-[15px]"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-3 rounded-2xl transition-all flex items-center justify-center flex-shrink-0 active:scale-95",
                  input.trim() && !isLoading ? "bg-white text-black shadow-lg shadow-white/10" : "bg-white/10 text-gray-600 cursor-not-allowed"
                )}
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-500 mt-3 font-medium tracking-widest uppercase">AI can occasionally make mistakes. Consider verifying important information.</p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteChatId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 p-6 rounded-2xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Delete Chat?</h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">Ta pogovor bo za vedno izgubljen. Ali si prepričan?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteChatId(null)} className="flex-1 py-3 bg-white/5 rounded-2xl font-semibold hover:bg-white/10 transition-colors">Cancel</button>
              <button onClick={() => deleteChat(deleteChatId)} className="flex-1 py-3 bg-red-500 rounded-2xl font-bold hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}