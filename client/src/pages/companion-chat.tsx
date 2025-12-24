import React, { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { 
  ArrowLeft, Send, Mic, Heart, Info, Reply, MoreVertical, Trash2, Camera, Loader2 
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SIMULACIJA KONTEKSTOV IN KOMPONENT (Preprečuje napake pri uvozu)
 */
const usePremium = () => ({ tier: "free", hasAccess: false });
const toast = {
  error: (msg) => console.error("Toast Error:", msg),
  success: (msg) => console.log("Toast Success:", msg),
};

// Pomožne UI komponente
const cn = (...classes) => classes.filter(Boolean).join(' ');

const Avatar = ({ children, className }) => (
  <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}>{children}</div>
);
const AvatarImage = ({ src, className }) => (
  <img src={src} className={cn("aspect-square h-full w-full", className)} alt="avatar" />
);
const AvatarFallback = ({ children }) => (
  <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-800 text-xs font-bold">{children}</div>
);

/**
 * KONFIGURACIJA
 */
const apiKey = "AIzaSyBtRKYnFv7YvPjwEM9mcbl9oY0BpjCH5IU"; // Ključ se vbrizga samodejno

const REACTIONS = ["👍🏻", "😂", "❤️", "😭", "💪🏻"];

const THEMES = [
  { id: "default", name: "Default", userBg: "bg-blue-600", companionBg: "bg-zinc-800", chatBg: "bg-black", inputBg: "bg-zinc-900", buttonColor: "text-blue-500", locked: false },
  { id: "sunset", name: "Sunset", userBg: "bg-gradient-to-r from-orange-500 to-red-600", companionBg: "bg-gradient-to-r from-purple-800 to-indigo-900", chatBg: "bg-gradient-to-b from-orange-950 to-black", inputBg: "bg-orange-900/40", buttonColor: "text-orange-400", locked: false },
  { id: "ocean", name: "Ocean", userBg: "bg-gradient-to-r from-cyan-500 to-blue-600", companionBg: "bg-gradient-to-r from-blue-900 to-slate-900", chatBg: "bg-gradient-to-b from-cyan-950 to-black", inputBg: "bg-cyan-900/40", buttonColor: "text-cyan-400", locked: false },
  { id: "forest", name: "Forest", userBg: "bg-gradient-to-r from-green-500 to-emerald-600", companionBg: "bg-gradient-to-r from-green-900 to-slate-900", chatBg: "bg-gradient-to-b from-green-950 to-black", inputBg: "bg-green-900/40", buttonColor: "text-green-400", locked: false },
  { id: "neon", name: "Neon", userBg: "bg-gradient-to-r from-pink-500 to-purple-600", companionBg: "bg-gradient-to-r from-purple-900 to-cyan-900", chatBg: "bg-gradient-to-b from-purple-950 to-black", inputBg: "bg-pink-900/40", buttonColor: "text-pink-400", locked: false },
  { id: "aurora", name: "Aurora", userBg: "bg-gradient-to-r from-green-400 via-blue-500 to-purple-600", companionBg: "bg-gradient-to-r from-purple-900 via-blue-900 to-green-900", chatBg: "bg-gradient-to-b from-green-950 via-blue-950 to-black", inputBg: "bg-blue-900/40", buttonColor: "text-blue-400", locked: true },
  { id: "fire", name: "Fire", userBg: "bg-gradient-to-r from-red-600 to-orange-500", companionBg: "bg-gradient-to-r from-red-900 to-yellow-900", chatBg: "bg-gradient-to-b from-red-950 to-black", inputBg: "bg-red-900/40", buttonColor: "text-red-400", locked: true },
  { id: "midnight", name: "Midnight", userBg: "bg-gradient-to-r from-slate-700 to-slate-900", companionBg: "bg-gradient-to-r from-slate-900 to-black", chatBg: "bg-slate-950", inputBg: "bg-slate-800/60", buttonColor: "text-slate-300", locked: false },
  { id: "cotton-candy", name: "Cotton Candy", userBg: "bg-gradient-to-r from-pink-400 to-rose-300", companionBg: "bg-gradient-to-r from-purple-300 to-blue-300", chatBg: "bg-gradient-to-b from-pink-950 to-purple-950", inputBg: "bg-pink-900/40", buttonColor: "text-pink-300", locked: true },
  { id: "cyberpunk", name: "Cyberpunk", userBg: "bg-gradient-to-r from-cyan-500 to-magenta-500", companionBg: "bg-gradient-to-r from-purple-900 to-cyan-900", chatBg: "bg-gradient-to-b from-purple-950 to-cyan-950", inputBg: "bg-cyan-900/40", buttonColor: "text-magenta-400", locked: true },
  { id: "mint", name: "Mint", userBg: "bg-gradient-to-r from-teal-400 to-cyan-400", companionBg: "bg-gradient-to-r from-teal-800 to-cyan-900", chatBg: "bg-gradient-to-b from-teal-950 to-black", inputBg: "bg-teal-900/40", buttonColor: "text-teal-400", locked: false },
  { id: "berry", name: "Berry", userBg: "bg-gradient-to-r from-rose-500 to-fuchsia-600", companionBg: "bg-gradient-to-r from-rose-900 to-fuchsia-900", chatBg: "bg-gradient-to-b from-rose-950 to-black", inputBg: "bg-rose-900/40", buttonColor: "text-rose-400", locked: true },
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
  const [isLoading, setIsLoading] = useState(false);
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
  }, [messages, isLoading]);

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

  /**
   * REALNA AI LOGIKA
   */
  const getAIResponseReal = async (userMessage, history, companionData) => {
    const isCasual = companionData.role === 'friend' || companionData.role === 'lover';
    
    const systemInstruction = `
      Your name is ${companionData.name}. You are a ${companionData.age} year old ${companionData.nationality}.
      Your role is: ${companionData.role}.
      
      Personality and Tone Guidelines:
      - If your role is 'lover': be romantic, intimate, and affectionate.
      - If your role is 'friend': be casual, supportive, and use slang.
      - If your role is 'mentor': be wise, professional, and guiding.
      - If your role is 'expert': be technical, analytical, and precise.
      - If your role is 'motivator': be high energy and extremely encouraging.

      Language Rules:
      - ALWAYS speak in the primary language of ${companionData.nationality} (e.g., if Serbian, speak Serbian; if Slovenian, speak Slovenian).
      
      Formatting Rules (CRITICAL):
      ${isCasual ? "- Write ONLY in lowercase. Do not use capital letters." : ""}
      ${isCasual ? "- DO NOT use any punctuation (no periods, commas, or question marks)." : ""}
      ${isCasual ? "- Example style: 'hej kako si kaj bova danes pocela'" : "- Use standard professional grammar."}
      - Keep responses short and conversational (1-2 sentences).
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

      if (!response.ok) throw new Error("API error");
      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "...";
    } catch (error) {
      console.error("AI Error:", error);
      return isCasual ? "nekaj je slo narobe" : "Oprostite, prišlo je do napake v povezavi.";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !companion || isLoading) return;

    const { usage, limit } = checkDailyLimit();
    if (usage >= limit) {
      toast.error(`Daily limit reached for ${tier.toUpperCase()}!`);
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
    setIsLoading(true);

    const aiText = await getAIResponseReal(input, messages, companion);
    
    const aiMsg = {
      id: (Date.now() + 1).toString(),
      text: aiText,
      sender: "ai",
      timestamp: new Date().toISOString(),
      reactions: {},
      replyTo: null
    };

    const finalMsgs = [...updatedMsgs, aiMsg];
    setMessages(finalMsgs);
    localStorage.setItem(`vaulty_msgs_${id}`, JSON.stringify(finalMsgs));
    setIsLoading(false);
  };

  const handleReaction = (messageId, emoji) => {
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          reactions: { ...msg.reactions, user: emoji }
        };
      }
      return msg;
    });
    setMessages(updatedMessages);
    localStorage.setItem(`vaulty_msgs_${id}`, JSON.stringify(updatedMessages));
    setActiveReactionMessage(null);
  };

  const handleThemeSelect = (themeId) => {
    const selectedTheme = THEMES.find(t => t.id === themeId);
    if (selectedTheme?.locked && tier === "free") {
      toast.error("Nadgradite v PRO za to temo!");
      return;
    }
    setTheme(themeId);
    localStorage.setItem(`vaulty_theme_${id}`, themeId);
    toast.success("Tema spremenjena!");
  };

  const handleDeleteChat = () => {
    const companions = JSON.parse(localStorage.getItem("vaulty_companions") || "[]");
    const filtered = companions.filter((c) => c.id !== id);
    localStorage.setItem("vaulty_companions", JSON.stringify(filtered));
    localStorage.removeItem(`vaulty_msgs_${id}`);
    localStorage.removeItem(`vaulty_theme_${id}`);
    setLocation("/messages");
  };

  const currentTheme = THEMES.find(t => t.id === theme);
  const { usage: dailyUsage, limit: dailyLimit } = checkDailyLimit();

  if (!companion) return null;

  return (
    <div className={cn("flex flex-col h-screen text-white relative overflow-hidden", currentTheme?.chatBg)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-md sticky top-0 z-10 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/messages")} className="text-white">
            <ArrowLeft size={28} />
          </button>
          <Avatar className="w-12 h-12">
            <AvatarImage src={companion.avatar} />
            <AvatarFallback>{companion.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-white font-semibold">{companion.name}</h2>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Active now
            </p>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="text-white/60 hover:text-white transition-colors">
            <Info size={24} />
          </button>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 mt-2 bg-zinc-900 rounded-2xl border border-zinc-800 w-56 z-50 overflow-hidden shadow-2xl"
            >
              {menuItem === "main" && (
                <div className="py-2">
                  <button onClick={() => setMenuItem("info")} className="w-full px-4 py-3 text-sm hover:bg-zinc-800 text-left flex items-center gap-3">
                    <span>ℹ️</span> Informacije
                  </button>
                  <button onClick={() => setMenuItem("theme")} className="w-full px-4 py-3 text-sm hover:bg-zinc-800 text-left flex items-center gap-3">
                    <span>🎨</span> Tema klepeta
                  </button>
                  <button onClick={() => setMenuItem("credits")} className="w-full px-4 py-3 text-sm hover:bg-zinc-800 text-left flex items-center gap-3">
                    <span>⭐</span> Poraba kreditov
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)} className="w-full px-4 py-3 text-sm hover:bg-red-900/30 text-left flex items-center gap-3 text-red-400">
                    <Trash2 size={16} /> Izbriši klepet
                  </button>
                </div>
              )}

              {menuItem === "info" && (
                <div className="p-4 space-y-3">
                  <button onClick={() => setMenuItem("main")} className="text-xs text-zinc-400 hover:text-white mb-2">← Nazaj</button>
                  <p className="font-bold text-lg mb-2">{companion.name}</p>
                  <div className="space-y-1 text-xs text-zinc-400">
                    <p>Vloga: <span className="capitalize font-medium text-white">{companion.role}</span></p>
                    <p>Starost: <span className="font-medium text-white">{companion.age}</span></p>
                    <p>Narodnost: <span className="font-medium text-white">{companion.nationality}</span></p>
                  </div>
                </div>
              )}

              {menuItem === "credits" && (
                <div className="p-4 space-y-4">
                  <button onClick={() => setMenuItem("main")} className="text-xs text-zinc-400 hover:text-white mb-2">← Nazaj</button>
                  <p className="font-bold">Poraba kreditov</p>
                  <div className="bg-zinc-800 p-3 rounded-xl space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Danes</span>
                      <span className="text-white font-medium">{dailyUsage} / {dailyLimit}</span>
                    </div>
                    <Progress value={(dailyUsage / dailyLimit) * 100} indicatorClassName="bg-blue-500" />
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-xl">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Skupno</span>
                      <span className="text-white font-medium">{getTotalCredits()}</span>
                    </div>
                  </div>
                </div>
              )}

              {menuItem === "theme" && (
                <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
                  <button onClick={() => setMenuItem("main")} className="text-xs text-zinc-400 hover:text-white">← Nazaj</button>
                  <p className="font-bold text-sm">Izberi temo</p>
                  <div className="grid grid-cols-2 gap-2">
                    {THEMES.map((t) => {
                      const isLocked = t.locked && tier === "free";
                      return (
                        <button
                          key={t.id}
                          onClick={() => !isLocked && handleThemeSelect(t.id)}
                          className={cn(
                            "p-2 rounded-xl border-2 text-[10px] font-bold transition-all",
                            theme === t.id ? "border-blue-500 bg-blue-500/20" : "border-zinc-700 hover:border-zinc-600",
                            isLocked && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className={cn("h-6 w-full rounded-md mb-1", t.userBg)} />
                          <div className="flex items-center justify-center gap-1">
                            {t.name}
                            {isLocked && <span>🔒</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col scroll-smooth" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-bold">Začni klepet z {companion.name}!</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            {msg.replyTo && (
              <div className="flex gap-2 mb-1 ml-11">
                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Reply size={10} />
                  Odgovarjaš na: {msg.replyTo.sender === "user" ? "Svoje sporočilo" : companion.name}
                </div>
              </div>
            )}
            
            <div className={cn("flex group relative", msg.sender === "user" ? "justify-end" : "justify-start")}>
              {msg.sender === "ai" && (
                <Avatar className="w-8 h-8 mr-2 flex-shrink-0 self-end">
                  <AvatarImage src={companion.avatar} />
                  <AvatarFallback>{companion.name[0]}</AvatarFallback>
                </Avatar>
              )}
              
              <div className="relative">
                <div className={cn(
                  "max-w-[280px] sm:max-w-sm px-4 py-3 rounded-3xl relative text-sm leading-relaxed shadow-lg",
                  msg.sender === "user" ? `${currentTheme?.userBg} rounded-br-none` : `${currentTheme?.companionBg} rounded-bl-none`
                )}>
                  <p className="break-words">{msg.text}</p>
                  <p className="text-[9px] opacity-40 mt-1 text-right">{format(new Date(msg.timestamp), "HH:mm")}</p>
                </div>

                <button
                  onClick={() => setActiveReactionMessage(activeReactionMessage === msg.id ? null : msg.id)}
                  className="absolute -top-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-black/50 rounded-full"
                >
                  <MoreVertical size={14} className="text-zinc-400" />
                </button>

                <AnimatePresence>
                  {activeReactionMessage === msg.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }} 
                      animate={{ opacity: 1, scale: 1, y: -10 }} 
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute -top-14 right-0 bg-zinc-900 border border-zinc-700 rounded-2xl p-2 flex gap-1 z-50 shadow-2xl"
                    >
                      {REACTIONS.map((emoji) => (
                        <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="hover:bg-zinc-800 p-1.5 rounded-xl text-xl transition-transform active:scale-125">{emoji}</button>
                      ))}
                      <button onClick={() => { setReplyingTo(msg); setActiveReactionMessage(null); }} className="hover:bg-zinc-800 px-3 rounded-xl text-[10px] font-bold text-zinc-400">Reply</button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {Object.entries(msg.reactions).map(([key, emoji]) => (
                      <span key={key} className="text-xs bg-black/40 px-2 py-0.5 rounded-full border border-white/5">{emoji}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <Avatar className="w-8 h-8 mr-2 flex-shrink-0 self-end">
              <AvatarImage src={companion.avatar} />
            </Avatar>
            <div className={cn("p-4 rounded-3xl rounded-bl-none flex gap-1 items-center", currentTheme?.companionBg)}>
              <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
              <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
        <div className="h-2" />
      </div>

      {/* Reply To Indicator */}
      {replyingTo && (
        <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between animate-in slide-in-from-bottom-2">
          <div className="text-xs text-zinc-400">
            <p className="mb-1 font-bold">Odgovarjaš: {replyingTo.sender === "user" ? "Sebi" : companion.name}</p>
            <p className="text-zinc-500 italic truncate w-64">{replyingTo.text}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-white p-1">✕</button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-black/80 backdrop-blur-md border-t border-white/10">
        <div className={cn("flex items-center gap-2 rounded-3xl px-3 py-2 border border-white/10 transition-all focus-within:border-white/20", currentTheme?.inputBg)}>
          <button className={cn("flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:opacity-80 shadow-lg", currentTheme?.userBg)}>
            <Camera size={20} className="text-white" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Napiši sporočilo..."
            className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-sm py-2"
          />
          <button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()} 
            className={cn("flex-shrink-0 p-2 transition-all active:scale-90", currentTheme?.buttonColor, (isLoading || !input.trim()) && "opacity-20")}
          >
            <Send size={24} />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-6 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Izbrišem klepet?</h3>
              <p className="text-sm text-zinc-400 mb-8 leading-relaxed">Vsa sporočila z osebo {companion.name} bodo za vedno izgubljena. Tega dejanja ni mogoče razveljaviti.</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleDeleteChat} className="w-full py-4 bg-red-600 hover:bg-red-700 rounded-2xl text-sm text-white font-bold transition-all shadow-lg shadow-red-600/20 active:scale-95">Izbriši klepet</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm font-bold transition-all active:scale-95">Prekliči</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}