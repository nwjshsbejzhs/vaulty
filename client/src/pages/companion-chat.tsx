import React, { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { 
  ArrowLeft, Send, Mic, Heart, Info, Reply, MoreVertical, Trash2, Camera, Loader2, Bot, Lock, X 
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

/**
 * LOCAL UI COMPONENTS (Replacing missing @/components/ui/ imports to prevent Black Screen)
 */
const cn = (...classes) => classes.filter(Boolean).join(' ');

const Avatar = ({ children, className }) => (
  <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10", className)}>{children}</div>
);
const AvatarImage = ({ src, className }) => (
  <img src={src} className={cn("aspect-square h-full w-full object-cover", className)} alt="avatar" />
);
const AvatarFallback = ({ children }) => (
  <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-800 text-xs font-bold">{children}</div>
);

const ProgressInternal = ({ value, className, indicatorClassName }) => (
  <div className={cn("relative w-full overflow-hidden rounded-full bg-white/10 h-1.5", className)}>
    <div 
      className={cn("h-full transition-all duration-500", indicatorClassName)} 
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }} 
    />
  </div>
);

// Fallback for Premium Context
const usePremium = () => {
  return { tier: "free", hasAccess: false };
};

// Simple Toast fallback
const toast = {
  success: (msg) => console.log("Toast Success:", msg),
  error: (msg) => console.log("Toast Error:", msg),
};

// Gemini AI configuration
const apiKey = "AIzaSyBtRKYnFv7YvPjwEM9mcbl9oY0BpjCH5IU"; 

const REACTIONS = ["👍🏻", "😂", "❤️", "😭", "💪🏻"];

const THEMES = [
  { id: "default", name: "Default", userBg: "bg-blue-600", companionBg: "bg-zinc-800", chatBg: "bg-black", inputBg: "bg-zinc-900", buttonColor: "text-blue-500", locked: false, animated: false },
  { id: "sunset", name: "Sunset", userBg: "bg-gradient-to-r from-orange-500 to-red-600", companionBg: "bg-gradient-to-r from-purple-800 to-indigo-900", chatBg: "bg-gradient-to-b from-orange-950 to-black", inputBg: "bg-orange-900/40", buttonColor: "text-orange-400", locked: false, animated: false },
  { id: "ocean", name: "Ocean", userBg: "bg-gradient-to-r from-cyan-500 to-blue-600", companionBg: "bg-gradient-to-r from-blue-900 to-slate-900", chatBg: "bg-gradient-to-b from-cyan-950 to-black", inputBg: "bg-cyan-900/40", buttonColor: "text-cyan-400", locked: false, animated: false },
  { id: "forest", name: "Forest", userBg: "bg-gradient-to-r from-green-500 to-emerald-600", companionBg: "bg-gradient-to-r from-green-900 to-slate-900", chatBg: "bg-gradient-to-b from-green-950 to-black", inputBg: "bg-green-900/40", buttonColor: "text-green-400", locked: false, animated: false },
  { id: "neon", name: "Neon", userBg: "bg-gradient-to-r from-pink-500 to-purple-600", companionBg: "bg-gradient-to-r from-purple-900 to-cyan-900", chatBg: "bg-gradient-to-b from-purple-950 to-black", inputBg: "bg-pink-900/40", buttonColor: "text-pink-400", locked: false, animated: false },
  { id: "aurora", name: "Aurora", userBg: "bg-gradient-to-r from-green-400 via-blue-500 to-purple-600", companionBg: "bg-gradient-to-r from-purple-900 via-blue-900 to-green-900", chatBg: "bg-gradient-to-b from-green-950 via-blue-950 to-black", inputBg: "bg-blue-900/40", buttonColor: "text-blue-400", locked: true, animated: true },
  { id: "fire", name: "Fire", userBg: "bg-gradient-to-r from-red-600 to-orange-500", companionBg: "bg-gradient-to-r from-red-900 to-yellow-900", chatBg: "bg-gradient-to-b from-red-950 to-black", inputBg: "bg-red-900/40", buttonColor: "text-red-400", locked: true, animated: true },
  { id: "midnight", name: "Midnight", userBg: "bg-gradient-to-r from-slate-700 to-slate-900", companionBg: "bg-gradient-to-r from-slate-900 to-black", chatBg: "bg-slate-950", inputBg: "bg-slate-800/60", buttonColor: "text-slate-300", locked: false, animated: false },
  { id: "cotton-candy", name: "Cotton Candy", userBg: "bg-gradient-to-r from-pink-400 to-rose-300", companionBg: "bg-gradient-to-r from-purple-300 to-blue-300", chatBg: "bg-gradient-to-b from-pink-950 to-purple-950", inputBg: "bg-pink-900/40", buttonColor: "text-pink-300", locked: true, animated: true },
  { id: "cyberpunk", name: "Cyberpunk", userBg: "bg-gradient-to-r from-cyan-500 to-magenta-500", companionBg: "bg-gradient-to-r from-purple-900 to-cyan-900", chatBg: "bg-gradient-to-b from-purple-950 to-cyan-950", inputBg: "bg-cyan-900/40", buttonColor: "text-magenta-400", locked: true, animated: true },
  { id: "mint", name: "Mint", userBg: "bg-gradient-to-r from-teal-400 to-cyan-400", companionBg: "bg-gradient-to-r from-teal-800 to-cyan-900", chatBg: "bg-gradient-to-b from-teal-950 to-black", inputBg: "bg-teal-900/40", buttonColor: "text-teal-400", locked: false, animated: false },
  { id: "berry", name: "Berry", userBg: "bg-gradient-to-r from-rose-500 to-fuchsia-600", companionBg: "bg-gradient-to-r from-rose-900 to-fuchsia-900", chatBg: "bg-gradient-to-b from-rose-950 to-black", inputBg: "bg-rose-900/40", buttonColor: "text-rose-400", locked: true, animated: false },
];

export default function CompanionChat() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/messages/companion/:id");
  const { tier } = usePremium();
  const [input, setInput] = useState("");
  const [companion, setCompanion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeReactionMessage, setActiveReactionMessage] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuItem, setMenuItem] = useState("main");
  const [theme, setTheme] = useState("default");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);
  const id = params?.id;

  useEffect(() => {
    if (id) {
      const companions = JSON.parse(localStorage.getItem("vaulty_companions") || "[]");
      const found = companions.find((c) => c.id === id);
      if (found) {
        setCompanion(found);
        const storedMessages = JSON.parse(localStorage.getItem(`vaulty_msgs_${id}`) || "[]");
        setMessages(storedMessages);
        const storedTheme = localStorage.getItem(`vaulty_theme_${id}`) || "default";
        setTheme(storedTheme);
      } else {
        setLocation("/messages");
      }
    }
  }, [id, setLocation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const checkDailyLimit = () => {
    const today = new Date().toLocaleDateString();
    const key = `vaulty_usage_${today}`;
    const usageVal = parseInt(localStorage.getItem(key) || "0");
    
    let limitVal = 50;
    if (tier === "pro") limitVal = 150;
    if (tier === "ultra") limitVal = 350;
    if (tier === "max") limitVal = 600;

    return { usage: usageVal, limit: limitVal };
  };

  const getTotalCredits = () => {
    const stored = localStorage.getItem("vaulty_total_credits") || "0";
    return parseInt(stored);
  };

  const incrementDailyUsage = () => {
    const today = new Date().toLocaleDateString();
    const key = `vaulty_usage_${today}`;
    const current = parseInt(localStorage.getItem(key) || "0");
    localStorage.setItem(key, (current + 1).toString());
    
    const total = getTotalCredits();
    localStorage.setItem("vaulty_total_credits", (total + 1).toString());
  };

  const getAIResponseReal = async (userMessage, history, companionData) => {
    const isCasual = companionData.role === 'friend' || companionData.role === 'lover';
    
    const systemInstruction = `
      Your name is ${companionData.name}. You are a ${companionData.age} year old from ${companionData.nationality}.
      Your gender is ${companionData.gender || 'female'}.
      Your role is: ${companionData.role}.
      
      Personality:
      - Role 'lover': Romantic, intimate, affectionate.
      - Role 'friend': Casual, supportive, uses modern slang.
      - Role 'mentor': Wisdom-filled, guiding, professional.
      - Role 'expert': Technical, analytical, precise.
      
      Language & Gender:
      - Strictly speak in the primary language of ${companionData.nationality}.
      - IMPORTANT: Adapt your speech to your gender (${companionData.gender || 'female'}). Use correct gendered grammar.
      
      Style Rules:
      ${isCasual ? "- WRITE ONLY IN LOWERCASE. NO CAPITAL LETTERS AT ALL." : "- Use standard grammar."}
      ${isCasual ? "- DO NOT USE PUNCTUATION (no dots, no commas, no question marks)." : ""}
      - Be very conversational and short (1-2 sentences).
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            ...history.slice(-10).map(m => ({
              role: m.sender === "user" ? "user" : "model",
              parts: [{ text: m.text }]
            })),
            { role: "user", parts: [{ text: userMessage }] }
          ],
          systemInstruction: { parts: [{ text: systemInstruction }] }
        })
      });

      if (!response.ok) throw new Error("API Failure");
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) return isCasual ? "im sorry i dont know what to say" : "I apologize, I'm not sure how to respond.";

      let final = text.trim();
      if (isCasual) {
        final = final.toLowerCase().replace(/[.,!?;:]/g, "");
      }
      return final;
    } catch (error) {
      console.error("AI Error:", error);
      return isCasual ? "sorry something went wrong" : "Error connecting to AI service.";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !companion || isTyping) return;

    const { usage: dailyUsage, limit: dailyLimit } = checkDailyLimit();
    if (dailyUsage >= dailyLimit) {
      toast.error(`Daily limit reached for your ${tier.toUpperCase()} plan!`);
      return;
    }

    const userMsg = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date().toISOString(),
      reactions: {},
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.sender } : null
    };

    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    localStorage.setItem(`vaulty_msgs_${id}`, JSON.stringify(updatedMsgs));
    setInput("");
    setReplyingTo(null);
    incrementDailyUsage();

    setIsTyping(true);
    const responseText = await getAIResponseReal(userMsg.text, updatedMsgs, companion);
    
    // Realistic typing delay: 40ms per char + base delay
    const typingDuration = Math.min(Math.max(responseText.length * 40, 1600), 7500);

    setTimeout(() => {
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: "ai",
        timestamp: new Date().toISOString(),
        reactions: {},
        replyTo: null
      };

      const finalMsgs = [...updatedMsgs, aiMsg];
      setMessages(finalMsgs);
      localStorage.setItem(`vaulty_msgs_${id}`, JSON.stringify(finalMsgs));
      setIsTyping(false);
    }, typingDuration);
  };

  const handleReaction = (messageId, emoji) => {
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        return { ...msg, reactions: { ...msg.reactions, user: emoji } };
      }
      return msg;
    });
    setMessages(updatedMessages);
    localStorage.setItem(`vaulty_msgs_${id}`, JSON.stringify(updatedMessages));
    setActiveReactionMessage(null);
  };

  const currentTheme = THEMES.find(t => t.id === theme);
  const { usage: dailyUsage, limit: dailyLimit } = checkDailyLimit();

  if (!companion) return null;

  return (
    <div className={cn("flex flex-col h-[100dvh] text-white relative overflow-hidden", currentTheme?.chatBg)}>
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between p-4 bg-black/80 backdrop-blur-md sticky top-0 z-30 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/messages")} className="active:scale-90 transition-transform">
            <ArrowLeft size={28} />
          </button>
          <Avatar className="w-12 h-12">
            <AvatarImage src={companion.avatar} />
            <AvatarFallback>{companion.name[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="font-bold truncate max-w-[120px]">{companion.name}</h2>
            <p className="text-[10px] text-green-500 font-black uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
            </p>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="text-white/60 hover:text-white transition-colors">
            <Info size={24} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 mt-2 bg-zinc-900 border border-white/10 rounded-2xl w-56 z-50 overflow-hidden shadow-2xl"
              >
                {menuItem === "main" ? (
                  <div className="py-2">
                    <button onClick={() => setMenuItem("info")} className="w-full px-4 py-3 text-sm hover:bg-white/5 text-left flex items-center gap-3">
                      <span>ℹ️</span> Information
                    </button>
                    <button onClick={() => setMenuItem("theme")} className="w-full px-4 py-3 text-sm hover:bg-white/5 text-left flex items-center gap-3">
                      <span>🎨</span> Theme
                    </button>
                    <button onClick={() => setMenuItem("credits")} className="w-full px-4 py-3 text-sm hover:bg-white/5 text-left flex items-center gap-3">
                      <span>⭐</span> Credits
                    </button>
                    <button onClick={() => setShowDeleteConfirm(true)} className="w-full px-4 py-3 text-sm hover:bg-red-900/30 text-left flex items-center gap-3 text-red-400">
                      <Trash2 size={16} /> Delete Chat
                    </button>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    <button onClick={() => setMenuItem("main")} className="text-[10px] text-zinc-500 hover:text-white mb-2 flex items-center gap-1 font-black uppercase tracking-widest">
                      <ArrowLeft size={10} /> Back
                    </button>
                    {menuItem === "info" && (
                      <div className="space-y-2">
                        <p className="font-bold text-sm">{companion.name}</p>
                        <div className="space-y-1 text-[11px] text-zinc-400">
                          <p className="flex justify-between border-b border-white/5 pb-1">Role: <span className="text-white capitalize font-bold">{companion.role}</span></p>
                          <p className="flex justify-between border-b border-white/5 pb-1">Age: <span className="text-white">{companion.age}</span></p>
                          <p className="flex justify-between border-b border-white/5 pb-1">Country: <span className="text-white">{companion.nationality}</span></p>
                          <p className="flex justify-between border-b border-white/5 pb-1 font-bold">Gender: <span className="text-white capitalize">{companion.gender || 'Female'}</span></p>
                        </div>
                      </div>
                    )}
                    {menuItem === "credits" && (
                      <div className="space-y-4">
                        <p className="font-bold text-sm">Credits</p>
                        <div className="bg-zinc-800 p-3 rounded-xl border border-white/5 shadow-inner">
                          <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-2 uppercase">
                            <span>Today</span>
                            <span>{dailyUsage} / {dailyLimit}</span>
                          </div>
                          <ProgressInternal value={(dailyUsage / dailyLimit) * 100} indicatorClassName="bg-blue-500" />
                        </div>
                        <p className="text-[9px] text-center text-zinc-500 uppercase tracking-widest font-black">Lifetime: {getTotalCredits()}</p>
                      </div>
                    )}
                    {menuItem === "theme" && (
                       <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                         {THEMES.map(t => (
                           <button 
                             key={t.id} 
                             onClick={() => {
                               if (t.locked && tier === 'free') {
                                 toast.error("Upgrade to PRO for this theme!");
                                 return;
                               }
                               setTheme(t.id);
                               localStorage.setItem(`vaulty_theme_${id}`, t.id);
                             }}
                             className={cn(
                               "h-12 rounded-xl border transition-all relative overflow-hidden",
                               theme === t.id ? "border-blue-500 shadow-lg" : "border-white/5 opacity-60"
                             )}
                           >
                             <div className={`absolute inset-0 ${t.userBg} opacity-30`} />
                             <span className="relative z-10 text-[8px] font-black uppercase">{t.name}</span>
                             {t.locked && tier === 'free' && <Lock size={8} className="absolute top-1 right-1" />}
                           </button>
                         ))}
                       </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col scroll-smooth" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
            <Bot size={64} strokeWidth={1} className="mb-4" />
            <p className="text-sm font-bold uppercase tracking-[0.2em]">Secure connection</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            {msg.replyTo && (
              <div className="flex gap-2 mb-1.5 ml-11 opacity-60">
                <Reply size={10} className="text-zinc-500 rotate-180" />
                <span className="text-[10px] text-zinc-500 truncate max-w-[200px] italic font-medium">
                   Reply: {msg.replyTo.text}
                </span>
              </div>
            )}
            
            <div className={`flex group relative items-end gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              {msg.sender === "ai" && (
                <Avatar className="w-8 h-8 flex-shrink-0 shadow-lg border border-white/5">
                  <AvatarImage src={companion.avatar} />
                  <AvatarFallback>{companion.name[0]}</AvatarFallback>
                </Avatar>
              )}
              
              <div className="relative max-w-[85%]">
                <div
                  onClick={() => setActiveReactionMessage(activeReactionMessage === msg.id ? null : msg.id)}
                  className={cn(
                    "px-4 py-3 rounded-2xl relative text-[15px] leading-relaxed shadow-xl cursor-pointer active:scale-[0.98] transition-all",
                    msg.sender === "user"
                      ? `${currentTheme?.userBg} text-white rounded-br-none`
                      : `${currentTheme?.companionBg} text-white rounded-bl-none border border-white/5`
                  )}
                >
                  <p className="break-words font-medium">{msg.text}</p>
                  <p className="text-[8px] opacity-40 mt-1 text-right font-mono tracking-widest">
                    {format(new Date(msg.timestamp), "HH:mm")}
                  </p>
                </div>

                <AnimatePresence>
                  {activeReactionMessage === msg.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: -10, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className={cn(
                        "absolute bottom-full bg-zinc-900 border border-white/10 rounded-full p-2 flex gap-1.5 z-50 shadow-2xl backdrop-blur-xl",
                        msg.sender === 'user' ? 'right-0' : 'left-0'
                      )}
                    >
                      {REACTIONS.map((emoji) => (
                        <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="hover:scale-125 active:scale-95 transition-transform p-1 text-xl">
                          {emoji}
                        </button>
                      ))}
                      <div className="w-[1px] bg-white/10 mx-1 self-stretch" />
                      <button onClick={() => { setReplyingTo(msg); setActiveReactionMessage(null); }} className="px-3 hover:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors">Reply</button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {Object.values(msg.reactions).map((emoji, i) => (
                      <span key={i} className="text-[11px] bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">{emoji}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start items-end gap-2.5 animate-in fade-in slide-in-from-left-2">
            <Avatar className="w-8 h-8 border border-white/5">
              <AvatarImage src={companion.avatar} />
            </Avatar>
            <div className={`px-5 py-4 rounded-2xl rounded-bl-none flex gap-1.5 items-center border border-white/5 shadow-lg ${currentTheme?.companionBg}`}>
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Footer Area - shrink-0 ensures it stays in view */}
      <footer className="shrink-0 p-4 bg-black/90 backdrop-blur-xl border-t border-white/10 z-40 pb-10">
        <AnimatePresence>
          {replyingTo && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between"
            >
              <div className="min-w-0 pr-4">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Reply: {replyingTo.sender === 'user' ? 'You' : companion.name}</p>
                <p className="text-xs text-zinc-400 truncate italic">"{replyingTo.text}"</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1.5 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className={cn("flex items-center gap-3 rounded-[2rem] px-3.5 py-2.5 border border-white/10 shadow-2xl transition-all focus-within:border-white/30 shadow-inner", currentTheme?.inputBg)}>
          <button className={cn("flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:brightness-125 shadow-lg active:scale-95", currentTheme?.userBg)}>
            <Camera size={20} className="text-white" />
          </button>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message..."
            className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-[15px] font-medium py-2.5 resize-none max-h-32 scrollbar-hide"
            rows={1}
            disabled={isTyping}
          />

          <button 
            onClick={handleSend} 
            disabled={!input.trim() || isTyping}
            className={cn(
              "flex-shrink-0 w-10 h-10 flex items-center justify-center transition-all active:scale-90 rounded-2xl shadow-lg",
              input.trim() && !isTyping ? currentTheme?.buttonColor : "text-zinc-800 opacity-20 cursor-not-allowed"
            )}
          >
            {isTyping ? <Loader2 size={20} className="animate-spin text-white" /> : <Send size={24} />}
          </button>
        </div>
      </footer>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6 backdrop-blur-lg"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black mb-3">Clear conversation?</h3>
              <p className="text-xs text-zinc-500 mb-10 leading-relaxed font-medium">All conversation history will be permanently deleted from your device.</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    const companions = JSON.parse(localStorage.getItem("vaulty_companions") || "[]");
                    const filtered = companions.filter((c) => c.id !== id);
                    localStorage.setItem("vaulty_companions", JSON.stringify(filtered));
                    localStorage.removeItem(`vaulty_msgs_${id}`);
                    localStorage.removeItem(`vaulty_theme_${id}`);
                    setLocation("/messages");
                  }} 
                  className="w-full py-4.5 bg-red-600 hover:bg-red-700 rounded-2xl text-xs text-white font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-600/20"
                >
                  Confirm Delete
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4.5 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}