import React, { useState, useEffect, useRef } from "react";
import { 
  Send, X, Settings, History, Copy, Check, ThumbsUp, ThumbsDown, 
  Volume2, Menu, User, CreditCard, Crown, Sparkles, ChevronLeft,
  Paperclip, ChevronDown, Lock, Zap, HardDrive, LogOut
} from "lucide-react";

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, getDocs, onSnapshot, deleteDoc, increment } from 'firebase/firestore';

// Konstante in konfiguracija
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'vaulty-ai-app';
const apiKey = ""; // Sistem samodejno uporabi ključ

const MODELS = [
  { id: "v1-basic", name: "Vaulty 1.0 Basic", tier: "free", cost: 0.05 },
  { id: "v1-pro", name: "Vaulty 1.0 Pro", tier: "pro", cost: 0.20 },
  { id: "v1.5-basic", name: "Vaulty 1.5 Basic", tier: "free", cost: 0.10 },
  { id: "v1.5-pro", name: "Vaulty 1.5 Pro", tier: "pro", cost: 0.50 },
];

const LIMITS = { free: 10, pro: 30, ultra: 100, max: Infinity };
const MEMORY_LIMITS = { free: 0.1, pro: 1, ultra: 5, max: 20 };

// Pomožne komponente (iz tvoje originalne kode)
const cn = (...classes) => classes.filter(Boolean).join(' ');

const Progress = ({ value, className, indicatorClassName }) => (
  <div className={cn("relative w-full overflow-hidden rounded-full", className)}>
    <div 
      className={cn("h-full transition-all duration-500", indicatorClassName)} 
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }} 
    />
  </div>
);

// Slikovna sredstva (placeholderji, ki jih uporabljaš v kodi)
const botAvatar = "https://images.unsplash.com/photo-1675249141982-64523447de51?w=100&h=100&fit=crop";
const vaultyLogo = "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=100&h=100&fit=crop";

export default function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [recentChats, setRecentChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [usage, setUsage] = useState(0);
  const [memoryUsed, setMemoryUsed] = useState(0);
  const [subscription, setSubscription] = useState("free");
  const [showMemoryMenu, setShowMemoryMenu] = useState(false);
  const [swipeId, setSwipeId] = useState(null);
  const [deleteChatId, setDeleteChatId] = useState(null);
  
  const messagesEndRef = useRef(null);

  // 1. Avtentikacija (Rule 3)
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // 2. Sinhronizacija s Firestore (Rule 1 & 2)
  useEffect(() => {
    if (!user) return;

    // Poslušaj zgodovino klepetov
    const chatsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'chatHistories');
    const unsubChats = onSnapshot(chatsRef, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentChats(chats.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10));
    }, (err) => console.error("Firestore error:", err));

    // Poslušaj porabo
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

  // Realna AI funkcija z Gemini API
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    const limit = LIMITS[subscription] || 10;
    if (limit !== Infinity && usage + selectedModel.cost > limit) {
      alert("Presegli ste omejitev kreditov! Nadgradite svoj paket.");
      return;
    }

    const userMessage = input.trim();
    const newUserMsg = { role: "user", content: userMessage, timestamp: Date.now() };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // API klic s 5 poizkusi (Exponential Backoff)
      let aiText = "";
      let delay = 1000;
      for (let i = 0; i < 5; i++) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userMessage }] }],
              systemInstruction: { parts: [{ text: "Ti si Vaulty AI, vrhunski pomočnik. Odgovarjaj strokovno in v jeziku uporabnika." }] }
            })
          });
          const data = await response.json();
          aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Oprostite, prišlo je do napake.";
          break;
        } catch (e) {
          if (i === 4) throw e;
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        }
      }

      const newBotMsg = { role: "assistant", content: aiText, timestamp: Date.now(), feedback: null };
      const updatedMessages = [...messages, newUserMsg, newBotMsg];
      setMessages(updatedMessages);

      // Shrani v Firebase (Rule 1)
      const chatTitle = userMessage.slice(0, 30) + "...";
      if (currentChatId) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'chatHistories', currentChatId), {
          messages: updatedMessages,
          updatedAt: Date.now(),
        });
      } else {
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'chatHistories'), {
          title: chatTitle,
          messages: updatedMessages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setCurrentChatId(docRef.id);
      }

      // Posodobi porabo
      const memUsed = (userMessage.length + aiText.length) / (1024 * 1024 * 1024);
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'features', 'ai_usage'), {
        used: increment(selectedModel.cost),
        memoryUsed: increment(memUsed),
        lastUpdated: Date.now()
      }, { merge: true });

    } catch (error) {
      console.error("AI error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'chatHistories', id));
    if (currentChatId === id) {
      setMessages([]);
      setCurrentChatId(null);
    }
    setDeleteChatId(null);
  };

  const limitVal = LIMITS[subscription] || 10;
  const usagePercent = limitVal === Infinity ? 0 : Math.min(100, (usage / limitVal) * 100);
  const memoryLimit = MEMORY_LIMITS[subscription] || 0.1;

  // Tvoj originalni dizajn (Return JSX ostane nespremenjen)
  return (
    <div className="flex h-screen bg-black text-white overflow-hidden relative">
      {/* Sidebar - Tvoja koda */}
      <div className={cn(
        "fixed inset-y-0 left-0 w-80 bg-black/80 backdrop-blur-xl z-50 transform transition-transform duration-300 ease-in-out border-r border-white/10 flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:static"
      )}>
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
            <p className="text-xs text-gray-500 font-bold tracking-widest mb-2">RECENT</p>
            {recentChats.map(chat => (
              <div key={chat.id} className="relative overflow-hidden rounded-lg">
                <div
                  className={cn(
                    "w-full flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all group cursor-pointer relative",
                    currentChatId === chat.id && "bg-white/10 border-white/20"
                  )}
                  onClick={() => {
                    setMessages(chat.messages || []);
                    setCurrentChatId(chat.id);
                    setIsSidebarOpen(false);
                  }}
                >
                  <div className="flex-1 text-left text-sm truncate">{chat.title}</div>
                  <X size={14} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400" onClick={(e) => { e.stopPropagation(); setDeleteChatId(chat.id); }} />
                </div>
              </div>
            ))}
          </div>

          {/* Profile & Memory - Tvoja koda */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            <div className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors mb-3 cursor-pointer" onClick={() => setShowMemoryMenu(!showMemoryMenu)}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center overflow-hidden">
                  <User size={16} className="text-cyan-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white">{user?.isAnonymous ? 'Guest' : (user?.displayName || 'User')}</p>
                  <p className="text-[10px] text-gray-400 uppercase">{subscription}</p>
                </div>
              </div>
              <ChevronDown size={16} className="text-gray-400" />
            </div>

            {showMemoryMenu && (
               <div className="p-3 mb-3 bg-white/5 border border-white/10 rounded-xl space-y-4">
                 <div>
                    <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">Memory Storage</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-300">{memoryUsed.toFixed(2)} GB / {memoryLimit.toFixed(1)} GB</span>
                      </div>
                      <Progress value={(memoryUsed / memoryLimit) * 100} className="h-1 bg-white/10" indicatorClassName="bg-gradient-to-r from-purple-500 to-pink-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">Monthly Credits</p>
                    <div className="flex justify-between text-[10px] mb-2">
                      <span className="text-gray-300">${usage.toFixed(2)} / {limitVal === Infinity ? "∞" : `$${limitVal}`}</span>
                    </div>
                    <Progress value={usagePercent} className="h-1 bg-white/10" indicatorClassName="bg-gradient-to-r from-cyan-500 to-blue-500" />
                  </div>
               </div>
            )}
            <div className="text-[10px] text-gray-500 text-center">VAULTY AI v1.5</div>
          </div>
        </div>
      </div>

      {/* Main Chat Area - Tvoja koda */}
      <div className="flex-1 flex flex-col w-full min-w-0">
        <header className="h-16 border-b border-white/10 flex items-center px-4 justify-between bg-black/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-full lg:hidden">
              <Menu size={24} />
            </button>
            <div className="relative group">
               <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <span className="font-bold text-sm text-white">{selectedModel.name}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
            </div>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full text-gray-400"><X size={24} /></button>
        </header>

        {/* Messages - Tvoja koda */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-700">
              <div className="w-32 h-32 mb-8 relative">
                <img src={vaultyLogo} alt="Vaulty AI" className="w-full h-full object-contain relative z-10" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 text-white">VAULTY AI</h1>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={cn("flex gap-4 max-w-3xl mx-auto", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden", msg.role === "user" ? "bg-white/10" : "bg-transparent")}>
                  {msg.role === "user" ? <User size={16} /> : <img src={botAvatar} className="w-full h-full object-cover" alt="AI" />}
                </div>
                <div className={cn("p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed", msg.role === "user" ? "bg-white text-black rounded-tr-sm" : "bg-white/5 border border-white/10 rounded-tl-sm")}>
                  {msg.content}
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
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Tvoja koda */}
        <div className="p-4 bg-transparent backdrop-blur-sm z-20 border-t border-white/5">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-3xl p-1.5 relative flex items-end gap-2" style={{ background: "rgba(15, 15, 15, 0.7)", backdropFilter: "blur(20px)", boxShadow: "0 0 40px -10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1)" }}>
              <button className="p-3 rounded-full hover:bg-white/10 text-white flex-shrink-0"><Paperclip size={20} /></button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                placeholder={`Message ${selectedModel.name}...`}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400 py-3 px-2 max-h-32 overflow-y-auto resize-none"
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-3 rounded-full transition-all flex items-center justify-center flex-shrink-0",
                  input.trim() && !isLoading ? "bg-white text-black shadow-lg" : "bg-white/10 text-gray-400 cursor-not-allowed"
                )}
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-500 mt-3 font-medium tracking-wide">AI can occasionally make mistakes. Consider verifying important information.</p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteChatId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 p-6 rounded-2xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Delete Chat?</h3>
            <p className="text-sm text-gray-400 mb-6">Are you sure? This conversation will be lost forever.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteChatId(null)} className="flex-1 py-2 bg-white/5 rounded-lg">Cancel</button>
              <button onClick={() => deleteChat(deleteChatId)} className="flex-1 py-2 bg-red-500 rounded-lg font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}