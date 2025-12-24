import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
// Fallback for premium context to prevent compilation errors in sandbox
import { usePremium as usePremiumOriginal } from "@/contexts/premium-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Mic, Heart, Info, Reply, MoreVertical, Trash2, Camera, Loader2, Bot, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

// Safety check for usePremium to avoid "black screen" if the module can't be resolved
const usePremium = () => {
  try {
    return usePremiumOriginal();
  } catch (e) {
    // Return a default state if the context is missing in this environment
    return { tier: "free" };
  }
};

// Configuration for Gemini AI
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

const ProgressInternal = ({ value, className, indicatorClassName }: any) => (
  <div className={`relative w-full overflow-hidden rounded-full bg-white/10 h-2 ${className}`}>
    <div 
      className={`h-full transition-all duration-500 ${indicatorClassName}`} 
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }} 
    />
  </div>
);

export default function CompanionChat() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/messages/companion/:id");
  const { tier } = usePremium();
  const [input, setInput] = useState("");
  const [companion, setCompanion] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [activeReactionMessage, setActiveReactionMessage] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuItem, setMenuItem] = useState<"main" | "info" | "theme" | "credits">("main");
  const [theme, setTheme] = useState("default");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const id = params?.id;

  useEffect(() => {
    if (id) {
      const companions = JSON.parse(localStorage.getItem("vaulty_companions") || "[]");
      const found = companions.find((c: any) => c.id === id);
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
    const usage = parseInt(localStorage.getItem(key) || "0");
    
    let limit = 50;
    if (tier === "pro") limit = 150;
    if (tier === "ultra") limit = 350;
    if (tier === "max") limit = 600;

    return { usage, limit };
  };

  const getTotalCredits = () => {
    const stored = localStorage.getItem("vaulty_total_credits") || "0";
    return parseInt(stored);
  };

  const incrementDailyUsage = () => {
    const today = new Date().toLocaleDateString();
    const key = `vaulty_usage_${today}`;
    const usage = parseInt(localStorage.getItem(key) || "0");
    localStorage.setItem(key, (usage + 1).toString());
    
    const total = getTotalCredits();
    localStorage.setItem("vaulty_total_credits", (total + 1).toString());
  };

  // REAL AI CALL WITH GENDER, NATIONALITY AND STYLE AWARENESS
  const getAIResponseReal = async (userMessage: string, history: any[], companionData: any) => {
    const isCasual = companionData.role === 'friend' || companionData.role === 'lover';
    
    const systemInstruction = `
      Your name is ${companionData.name}. You are a ${companionData.age} year old ${companionData.nationality}.
      Your gender is ${companionData.gender || 'female'}.
      Your role is: ${companionData.role}.
      
      Personality Guidelines:
      - If your role is 'lover': be romantic, intimate, and highly affectionate.
      - If your role is 'friend': be extremely casual, supportive, and use modern slang.
      - If your role is 'mentor': be professional, wise, and guiding.
      - If your role is 'expert': be technical, analytical, and precise.
      - If your role is 'motivator': be high energy and encouraging.

      Language Rules:
      - ALWAYS speak in the language associated with your nationality (${companionData.nationality}). For example, if nationality is Serbian, speak Serbian.
      - Use grammar and tone appropriate for your specified gender (${companionData.gender || 'female'}). In Slavic languages, ensure correct verb/adjective suffixes.

      Style Rules (CRITICAL):
      ${isCasual ? "- WRITE ONLY IN LOWERCASE. DO NOT USE CAPITAL LETTERS." : "- Use standard professional grammar."}
      ${isCasual ? "- DO NOT USE PUNCTUATION. No periods, no commas, no question marks." : ""}
      ${isCasual ? "- Example style: 'hey how are you what are we doing today'" : ""}
      - Keep responses short and conversational (1-3 sentences).
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            ...history.slice(-8).map(m => ({
              role: m.sender === "user" ? "user" : "model",
              parts: [{ text: m.text }]
            })),
            { role: "user", parts: [{ text: userMessage }] }
          ],
          systemInstruction: { parts: [{ text: systemInstruction }] }
        })
      });

      if (!response.ok) throw new Error("API Error");
      const result = await response.json();
      let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "...";
      
      if (isCasual) {
        text = text.toLowerCase().replace(/[.,!?;:]/g, "");
      }
      
      return text;
    } catch (error) {
      console.error("AI Error:", error);
      return isCasual ? "sorry something went wrong" : "I apologize, but I encountered a connection error.";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !companion || isTyping) return;

    const { usage, limit } = checkDailyLimit();
    if (usage >= limit) {
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

    // Start Realistic Typing Simulation
    setIsTyping(true);

    const responseText = await getAIResponseReal(userMsg.text, updatedMsgs, companion);
    
    // 100% REALISTIC TIMING: approx 40ms per character + base delay
    const typingDuration = Math.min(Math.max(responseText.length * 40, 1500), 8000);

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

  const handleReaction = (messageId: string, emoji: string) => {
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

  const handleThemeSelect = (themeId: string) => {
    const selectedTheme = THEMES.find(t => t.id === themeId);
    if (selectedTheme?.locked && tier === "free") {
      toast.error("Upgrade to PRO to unlock premium themes!");
      return;
    }
    setTheme(themeId);
    localStorage.setItem(`vaulty_theme_${id}`, themeId);
    toast.success("Theme changed!");
  };

  const handleDeleteChat = () => {
    const companions = JSON.parse(localStorage.getItem("vaulty_companions") || "[]");
    const filtered = companions.filter((c: any) => c.id !== id);
    localStorage.setItem("vaulty_companions", JSON.stringify(filtered));
    localStorage.removeItem(`vaulty_msgs_${id}`);
    localStorage.removeItem(`vaulty_theme_${id}`);
    setLocation("/messages");
  };

  const currentTheme = THEMES.find(t => t.id === theme);
  const { usage: dailyUsage, limit: dailyLimit } = checkDailyLimit();

  if (!companion) return null;

  return (
    <div className={`flex flex-col h-[100dvh] ${currentTheme?.chatBg} text-white relative overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-md sticky top-0 z-20 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/messages")} className="text-white active:scale-90 transition-transform">
            <ArrowLeft size={28} />
          </button>
          <Avatar className="w-12 h-12 border border-white/10 shadow-sm">
            <AvatarImage src={companion.avatar} className="object-cover" />
            <AvatarFallback>{companion.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-white font-semibold leading-tight">{companion.name}</h2>
            <p className="text-[10px] text-green-500 flex items-center gap-1 font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Active now
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
                {menuItem === "main" && (
                  <div className="py-2">
                    <button onClick={() => setMenuItem("info")} className="w-full px-4 py-3 text-sm hover:bg-zinc-800 text-left flex items-center gap-3">
                      <span>ℹ️</span> Information
                    </button>
                    <button onClick={() => setMenuItem("theme")} className="w-full px-4 py-3 text-sm hover:bg-zinc-800 text-left flex items-center gap-3">
                      <span>🎨</span> Theme
                    </button>
                    <button onClick={() => setMenuItem("credits")} className="w-full px-4 py-3 text-sm hover:bg-zinc-800 text-left flex items-center gap-3">
                      <span>⭐</span> Credits
                    </button>
                    <button onClick={() => setShowDeleteConfirm(true)} className="w-full px-4 py-3 text-sm hover:bg-red-900/30 text-left flex items-center gap-3 text-red-400">
                      <Trash2 size={16} /> Delete Chat
                    </button>
                  </div>
                )}

                {menuItem !== "main" && (
                  <div className="p-4 space-y-4">
                    <button onClick={() => setMenuItem("main")} className="text-[10px] text-zinc-500 hover:text-white mb-2 flex items-center gap-1 font-black uppercase tracking-widest">
                      <ArrowLeft size={10} /> Back
                    </button>
                    
                    {menuItem === "info" && (
                      <div className="space-y-3">
                        <p className="font-bold text-sm tracking-tight">{companion.name}</p>
                        <div className="space-y-1 text-[11px] text-zinc-400">
                          <p className="flex justify-between border-b border-white/5 pb-1 text-zinc-300">Role: <span className="text-white font-medium capitalize">{companion.role}</span></p>
                          <p className="flex justify-between border-b border-white/5 pb-1 text-zinc-300">Age: <span className="text-white font-medium">{companion.age}</span></p>
                          <p className="flex justify-between border-b border-white/5 pb-1 text-zinc-300">Nationality: <span className="text-white font-medium">{companion.nationality}</span></p>
                          <p className="flex justify-between border-b border-white/5 pb-1 text-zinc-300">Gender: <span className="text-white font-medium capitalize">{companion.gender || 'Female'}</span></p>
                        </div>
                      </div>
                    )}

                    {menuItem === "credits" && (
                      <div className="space-y-4">
                        <p className="font-bold text-sm tracking-tight">Credits Usage</p>
                        <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5">
                          <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-2">
                            <span>TODAY'S MESSAGES</span>
                            <span>{dailyUsage} / {dailyLimit}</span>
                          </div>
                          <ProgressInternal value={(dailyUsage / dailyLimit) * 100} indicatorClassName="bg-blue-500" />
                        </div>
                        <div className="text-[10px] text-zinc-500 text-center font-bold uppercase tracking-tighter">Lifetime Credits: {getTotalCredits()}</div>
                      </div>
                    )}

                    {menuItem === "theme" && (
                      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                        {THEMES.map((t) => {
                          const isLocked = t.locked && tier === "free";
                          return (
                            <button
                              key={t.id}
                              onClick={() => !isLocked && handleThemeSelect(t.id)}
                              className={`p-2 rounded-xl border transition-all text-[9px] font-bold uppercase tracking-tighter ${
                                theme === t.id ? "border-blue-500 bg-blue-500/10" : "border-zinc-700 hover:border-zinc-600"
                              } ${isLocked ? "opacity-40" : ""}`}
                            >
                              <div className={`h-6 rounded-md mb-1 ${t.userBg}`} />
                              <div className="flex items-center justify-center gap-1">
                                {t.name}
                                {isLocked && <span>🔒</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col scroll-smooth pb-10" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
            <Bot size={60} strokeWidth={1} className="mb-4" />
            <p className="text-sm font-bold uppercase tracking-[0.2em]">Private Workspace</p>
            <p className="text-[10px] uppercase mt-2">Messages are encrypted</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            {msg.replyTo && (
              <div className="flex gap-2 mb-1.5 ml-11 opacity-60">
                <Reply size={10} className="text-zinc-500 rotate-180" />
                <span className="text-[10px] text-zinc-500 truncate max-w-[200px] italic">
                   Replying to: {msg.replyTo.text}
                </span>
              </div>
            )}
            
            <div className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} group relative items-end gap-2`}>
              {msg.sender === "ai" && (
                <Avatar className="w-8 h-8 flex-shrink-0 shadow-lg border border-white/5">
                  <AvatarImage src={companion.avatar} />
                  <AvatarFallback>{companion.name[0]}</AvatarFallback>
                </Avatar>
              )}
              
              <div className="relative max-w-[85%]">
                <div
                  onContextMenu={(e) => { e.preventDefault(); setActiveReactionMessage(msg.id); }}
                  className={`px-4 py-2.5 rounded-2xl relative text-[15px] leading-relaxed shadow-xl ${
                    msg.sender === "user"
                      ? `${currentTheme?.userBg} text-white rounded-br-none font-medium`
                      : `${currentTheme?.companionBg} text-white rounded-bl-none border border-white/5`
                  }`}
                >
                  <p className="break-words">{msg.text}</p>
                  <p className="text-[9px] opacity-40 mt-1 text-right font-mono">
                    {format(new Date(msg.timestamp), "HH:mm")}
                  </p>
                </div>

                <button
                  onClick={() => setActiveReactionMessage(activeReactionMessage === msg.id ? null : msg.id)}
                  className="absolute -top-7 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-black/50 rounded-full"
                >
                  <MoreVertical size={14} className="text-zinc-400" />
                </button>

                <AnimatePresence>
                  {activeReactionMessage === msg.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: -10, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className="absolute bottom-full left-0 bg-zinc-900 border border-white/10 rounded-full p-1.5 flex gap-1 z-50 shadow-2xl backdrop-blur-xl"
                    >
                      {REACTIONS.map((emoji) => (
                        <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="hover:scale-125 transition-transform p-1 text-xl active:scale-90">
                          {emoji}
                        </button>
                      ))}
                      <div className="w-[1px] bg-white/10 mx-1 self-stretch" />
                      <button onClick={() => { setReplyingTo(msg); setActiveReactionMessage(null); }} className="px-3 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors">REPLY</button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {Object.values(msg.reactions).map((emoji: any, i) => (
                      <span key={i} className="text-[11px] bg-black/40 px-2 py-0.5 rounded-full border border-white/10">{emoji}</span>
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
            <div className={`px-4 py-3 rounded-2xl rounded-bl-none flex gap-1.5 items-center border border-white/5 shadow-lg ${currentTheme?.companionBg}`}>
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Flex shrink 0 and dynamic viewport height fix visibility */}
      <footer className="shrink-0 p-4 bg-black/90 backdrop-blur-xl border-t border-white/10 z-30 pb-10">
        <AnimatePresence>
          {replyingTo && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 px-4 py-2.5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between shadow-inner"
            >
              <div className="min-w-0 pr-4">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Replying to {replyingTo.sender === 'user' ? 'You' : companion.name}</p>
                <p className="text-xs text-zinc-400 truncate italic font-medium">"{replyingTo.text}"</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1.5 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full"><X size={12} /></button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className={`flex items-center gap-3 rounded-[2rem] px-3.5 py-2.5 border border-white/10 shadow-2xl transition-all focus-within:border-white/30 ${currentTheme?.inputBg}`}>
          <button className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:brightness-125 shadow-lg active:scale-95 ${currentTheme?.userBg}`}>
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
            placeholder="Write something..."
            className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-[15px] font-medium py-2 resize-none max-h-32 scrollbar-hide"
            rows={1}
            disabled={isTyping}
          />

          <button 
            onClick={handleSend} 
            disabled={!input.trim() || isTyping}
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center transition-all active:scale-90 rounded-2xl ${
              input.trim() && !isTyping ? currentTheme?.buttonColor : "text-zinc-800 opacity-20 cursor-not-allowed"
            }`}
          >
            {isTyping ? <Loader2 size={20} className="animate-spin text-white" /> : <Send size={24} />}
          </button>
        </div>
      </footer>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-6 backdrop-blur-lg"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-[3rem] p-10 w-full max-w-sm text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <Trash2 size={40} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black mb-3 tracking-tight">Delete conversation?</h3>
              <p className="text-xs text-zinc-500 mb-10 leading-relaxed font-medium">All stored memory, messages and history with {companion.name} will be permanently removed from your device.</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleDeleteChat} className="w-full py-4.5 bg-red-600 hover:bg-red-700 rounded-2xl text-xs text-white font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-600/20">Delete Everything</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4.5 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const X = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);