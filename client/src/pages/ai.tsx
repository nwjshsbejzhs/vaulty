import React, { useState, useEffect, useRef } from "react";
import { 
  Send, X, Settings, History, Copy, Check, ThumbsUp, ThumbsDown, 
  Volume2, Menu, User, CreditCard, Crown, Sparkles, ChevronLeft,
  Paperclip, ChevronDown, Lock, Zap, HardDrive, LogOut, TrendingUp, Wallet, Landmark
} from "lucide-react";
import { useLocation } from "wouter";

// Firebase imports (Using standard library names to ensure resolution in single-file mode)
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithCustomToken, 
  signInAnonymously 
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

// --- Assets as Strings (Prevents bundler errors while keeping your paths) ---
const botAvatar = "@assets/1B800ADD-4D3C-4FAB-8D82-8893E729D46A_1765457083436.png";
const vaultyLogo = "@assets/1B800ADD-4D3C-4FAB-8D82-8893E729D46A_1765492359150.jpeg";

// --- Constants ---
const MODELS = [
  { id: "v1-basic", name: "Vaulty 1.0 Basic", tier: "free", cost: 0.05 },
  { id: "v1-pro", name: "Vaulty 1.0 Pro", tier: "pro", cost: 0.20 },
  { id: "v1.5-basic", name: "Vaulty 1.5 Basic", tier: "free", cost: 0.10 },
  { id: "v1.5-pro", name: "Vaulty 1.5 Pro", tier: "pro", cost: 0.50 },
];

const LIMITS = { free: 10, pro: 30, ultra: 100, max: Infinity };
const MEMORY_LIMITS = { free: 0.1, pro: 1, ultra: 5, max: 20 };

// --- Simplified UI Components ---
const Progress = ({ value, className, indicatorClassName }) => (
  <div className={`relative w-full h-full overflow-hidden rounded-full bg-white/10 ${className}`}>
    <div
      className={`h-full w-full flex-1 transition-all ${indicatorClassName}`}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
);

// --- Firebase Setup (Using environment globals) ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const apiKey = "AIzaSyBtRKYnFv7YvPjwEM9mcbl9oY0BpjCH5IU"; // Injected by environment

// --- Helper Functions ---
const formatContent = (text) => {
  if (!text) return null;
  let formatted = text
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-white">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2 text-white">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2 text-white">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>');

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

// --- Main App Component ---
export default function App() {
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState("free");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [recentChats, setRecentChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [usage, setUsage] = useState(0);
  const [memoryUsed, setMemoryUsed] = useState(0);
  const [deleteChatId, setDeleteChatId] = useState(null);
  
  const messagesEndRef = useRef(null);

  // 1. Authentication
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Data Persistence (Usage & Recent Chats)
  useEffect(() => {
    if (!user) return;

    // Listen for Usage Data
    const usageRef = doc(db, 'artifacts', appId, 'users', user.uid, 'features', 'ai_usage');
    const unsubUsage = onSnapshot(usageRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUsage(data.used || 0);
        setMemoryUsed(data.memoryUsed || 0);
      }
    }, (err) => console.error(err));

    // Listen for Recent Chats
    const chatsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'chatHistories');
    const unsubChats = onSnapshot(query(chatsRef), (snapshot) => {
      const chats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setRecentChats(chats.slice(0, 15));
    });

    return () => { unsubUsage(); unsubChats(); };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const getRealAIResponse = async (message, history) => {
    // SYSTEM PROMPT: Strict Finance & Crypto Expert
    const systemPrompt = `You are Vaulty AI, a specialized assistant for Finance and Cryptocurrency.
    - You ONLY answer questions related to finance, investing, stock markets, crypto, personal budget, and economy.
    - If the user asks about anything else (weather, general knowledge, etc.), answer: "I am Vaulty AI, a specialized financial assistant. I don't provide information on general topics."
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
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "I am sorry, I couldn't generate a response.";
    };

    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try { return await apiCall(); } catch (err) {
        if (i === 4) throw err;
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  };

  const handleSendMessage = async (textOverride) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isLoading || !user) return;
    
    const currentLimit = LIMITS[subscription] || 10;
    if (currentLimit !== Infinity && usage + selectedModel.cost > currentLimit) {
      alert("Credits Exhausted. Please upgrade your plan.");
      return;
    }

    const userMsg = { role: "user", content: textToSend.trim(), timestamp: Date.now() };
    const history = [...messages];
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const aiResponseText = await getRealAIResponse(userMsg.content, history);
      const botMsg = { role: "assistant", content: aiResponseText, timestamp: Date.now() };
      const updatedMessages = [...history, userMsg, botMsg];
      setMessages(updatedMessages);

      // Save to Firestore
      const chatTitle = userMsg.content.slice(0, 30) + "...";
      const chatData = {
        messages: updatedMessages,
        updatedAt: Date.now(),
        title: chatTitle
      };

      if (currentChatId) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'chatHistories', currentChatId), chatData);
      } else {
        const newDoc = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'chatHistories'), {
          ...chatData,
          createdAt: Date.now()
        });
        setCurrentChatId(newDoc.id);
      }

      // Update Usage stats
      const usageRef = doc(db, 'artifacts', appId, 'users', user.uid, 'features', 'ai_usage');
      const memInc = (userMsg.content.length + aiResponseText.length) / (1024 * 1024 * 1024);
      await setDoc(usageRef, { 
        used: increment(selectedModel.cost),
        memoryUsed: increment(memInc),
        lastUpdated: Date.now()
      }, { merge: true });

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChat = async (id) => {
    if (!user) return;
    const snap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'chatHistories', id));
    if (snap.exists()) {
      setMessages(snap.data().messages || []);
      setCurrentChatId(id);
      setIsSidebarOpen(false);
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
  const memoryLimitVal = MEMORY_LIMITS[subscription] || 0.1;

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden relative font-sans">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 w-80 bg-black/95 backdrop-blur-2xl z-50 transform transition-transform duration-300 ease-in-out border-r border-white/10 flex flex-col shadow-2xl",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full bg-gradient-to-b from-cyan-950/20 to-black">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="font-bold text-lg tracking-widest flex items-center gap-2">
              <img src={vaultyLogo} alt="Logo" className="w-6 h-6 object-contain" />
              VAULTY AI
            </h2>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
          </div>
          
          <div className="p-4">
             <button 
               onClick={() => { setMessages([]); setCurrentChatId(null); setIsSidebarOpen(false); }}
               className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 shadow-lg"
             >
               <Sparkles size={16} /> New Chat
             </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-1 scrollbar-hide">
            <p className="text-[10px] text-gray-500 font-bold tracking-widest mb-3 px-2 uppercase">Recent Activity</p>
            {recentChats.map(chat => (
              <div
                key={chat.id}
                className="group relative flex items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => loadChat(chat.id)}
              >
                <History size={14} className="text-gray-600 group-hover:text-cyan-400" />
                <div className="flex-1 text-xs truncate text-gray-400 group-hover:text-white">{chat.title}</div>
                <button onClick={(e) => { e.stopPropagation(); setDeleteChatId(chat.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-white/10 bg-black/40">
            <div className="bg-white/5 p-4 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cyan-600/20 flex items-center justify-center border border-cyan-500/20">
                   <User size={18} className="text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-none mb-1">{user?.displayName || "Member"}</p>
                  <p className="text-[9px] text-cyan-500 font-black uppercase tracking-widest">{subscription}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1.5 uppercase">
                    <span>Usage</span>
                    <span>${usage.toFixed(2)} / ${limitVal === Infinity ? "∞" : limitVal}</span>
                  </div>
                  <Progress value={limitVal === Infinity ? 0 : (usage / limitVal) * 100} className="h-1" indicatorClassName="bg-cyan-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full bg-black relative">
        {/* Fixed Header */}
        <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center px-4 justify-between bg-black/50 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 hover:bg-white/5 rounded-xl transition-all border border-transparent">
              <Menu size={20} />
            </button>
            <div className="h-6 w-px bg-white/10 mx-1" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{selectedModel.name}</span>
            </div>
          </div>
          <button onClick={() => setLocation("/")} className="p-2 hover:bg-white/5 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </header>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 scroll-smooth scrollbar-hide">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
              <div className="w-24 h-24 mb-6 p-2 bg-white/5 rounded-[40px] border border-white/5 shadow-2xl">
                <img src={vaultyLogo} alt="Vaulty AI" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter mb-4 text-white uppercase italic">Vaulty AI</h1>
              <p className="text-gray-500 text-sm max-w-sm mb-12">Expert financial intelligence for markets, crypto, and investing.</p>

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
                    "w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 border shadow-xl",
                    msg.role === "user" ? "bg-white text-black border-white" : "bg-black border-white/5"
                  )}>
                    {msg.role === "user" ? <User size={16} /> : <img src={botAvatar} className="w-full h-full object-cover rounded-2xl" alt="AI" />}
                  </div>
                  <div className={cn(
                    "relative p-5 rounded-3xl text-sm leading-relaxed max-w-[85%]",
                    msg.role === "user" ? "bg-white text-black font-semibold shadow-2xl" : "bg-[#0c0c0c] border border-white/5 text-gray-300 shadow-xl"
                  )}>
                    {msg.role === "assistant" ? formatContent(msg.content) : msg.content}
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5 opacity-50">
                        <button onClick={() => { navigator.clipboard.writeText(msg.content); toast({ title: "Copied" }); }} className="hover:text-white transition-colors"><Copy size={13} /></button>
                        <button className="hover:text-white transition-colors"><Volume2 size={13} /></button>
                        <div className="flex-1" />
                        <button className="hover:text-cyan-400 transition-colors"><ThumbsUp size={13} /></button>
                        <button className="hover:text-red-500 transition-colors"><ThumbsDown size={13} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-black border border-white/5 flex items-center justify-center shadow-xl">
                    <img src={botAvatar} className="w-full h-full object-cover rounded-2xl" alt="AI" />
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

        {/* Fixed Input Area (Always Visible) */}
        <div className="p-4 bg-gradient-to-t from-black via-black to-transparent flex-shrink-0 sticky bottom-0 z-40 pb-6">
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#111] border border-white/10 rounded-[32px] p-2 flex items-end gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] focus-within:border-white/20 transition-all">
              <button className="p-3.5 text-gray-500 hover:text-white transition-colors"><Paperclip size={20} /></button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder="Ask Vaulty about markets..."
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-white placeholder-gray-600 py-3.5 px-1 max-h-40 min-h-[48px] overflow-y-auto resize-none text-sm font-medium"
                rows={1}
                disabled={isLoading}
              />
              
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-3.5 rounded-full transition-all flex items-center justify-center flex-shrink-0 mb-0.5",
                  input.trim() && !isLoading ? "bg-white text-black hover:scale-105" : "bg-white/5 text-gray-700 cursor-not-allowed"
                )}
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-center text-[9px] text-gray-600 mt-4 font-black tracking-[0.2em] uppercase">Vaulty Financial Intelligence Unit</p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Overlay */}
      {deleteChatId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0c0c0c] border border-white/10 p-8 rounded-[40px] max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-black mb-3 text-white uppercase italic tracking-tighter">Terminate Chat?</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium">This sequence will be permanently removed from your history.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteChatId(null)} className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 font-bold transition-all uppercase tracking-widest text-[10px]">Cancel</button>
              <button onClick={() => deleteChat(deleteChatId)} className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 font-bold transition-all uppercase tracking-widest text-[10px]">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}