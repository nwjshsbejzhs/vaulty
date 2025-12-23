import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { usePremium } from "@/contexts/premium-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Mic, Heart, Info, Reply, MoreVertical, Trash2, Camera } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

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

const getAIResponse = (message: string, role: string, name: string) => {
  const responses: any = {
    friend: [
      "That's crazy! Tell me more.",
      "Haha, totally agree with you.",
      "Hey, wanna hang out later?",
      `Yeah, ${name} is always here for you!`,
      "Just chilling, wbu?",
      "Haha that's funny 😂",
      "For real though, that's awesome"
    ],
    lover: [
      "I was just thinking about you... ❤️",
      "You mean the world to me.",
      "Tell me everything, darling.",
      "I miss you so much.",
      "You make my heart skip a beat.",
      "Forever thinking about you 💕",
      "You're everything to me"
    ],
    mentor: [
      "That is an interesting perspective. Have you considered...",
      "Focus on your long-term goals.",
      "Failure is just a stepping stone to success.",
      "I believe in your potential.",
      "Let's analyze this situation logically.",
      "Remember, consistency is key",
      "You're on the right path"
    ],
    expert: [
      "Based on current data, I'd suggest...",
      "Let me break down the technical details.",
      "Here is the optimal solution.",
      "Interesting query. The facts state that...",
      "According to my analysis...",
      "The evidence supports that...",
      "From a technical standpoint..."
    ],
    motivator: [
      "YOU GOT THIS! 🔥",
      "Don't stop now! Keep pushing!",
      "Success is waiting for you!",
      "Believe in yourself!",
      "Let's CRUSH those goals!",
      "You're unstoppable! 💪",
      "Nothing can stop you now!"
    ]
  };

  const roleResponses = responses[role] || responses['friend'];
  return roleResponses[Math.floor(Math.random() * roleResponses.length)];
};

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
  }, [messages]);

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

  const handleSend = () => {
    if (!input.trim() || !companion) return;

    const { usage, limit } = checkDailyLimit();
    if (usage >= limit) {
      toast.error(`Daily message limit reached for your ${tier.toUpperCase()} plan!`);
      return;
    }

    const newMsg = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date().toISOString(),
      reactions: {},
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.sender } : null
    };

    const updatedMsgs = [...messages, newMsg];
    setMessages(updatedMsgs);
    localStorage.setItem(`vaulty_msgs_${id}`, JSON.stringify(updatedMsgs));
    setInput("");
    setReplyingTo(null);
    incrementDailyUsage();

    setTimeout(() => {
      const responseText = getAIResponse(input, companion.role, companion.name);
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: "ai",
        timestamp: new Date().toISOString(),
        reactions: {},
        replyTo: null
      };
      const withAi = [...updatedMsgs, aiMsg];
      setMessages(withAi);
      localStorage.setItem(`vaulty_msgs_${id}`, JSON.stringify(withAi));
    }, 1000 + Math.random() * 2000);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          reactions: {
            ...msg.reactions,
            user: emoji
          }
        };
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
  const { usage, limit } = checkDailyLimit();

  if (!companion) return null;

  return (
    <div className={`flex flex-col h-screen ${currentTheme?.chatBg} text-white relative overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-md sticky top-0 z-10 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/messages")} className="text-white">
            <ArrowLeft size={28} />
          </button>
          <Avatar className="w-12 h-12">
            <AvatarImage src={companion.avatar} className="object-cover" />
            <AvatarFallback>{companion.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-white font-semibold">{companion.name}</h2>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Active now
            </p>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="text-white/60 hover:text-white">
            <Info size={24} />
          </button>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 mt-2 bg-zinc-900 rounded-lg border border-zinc-800 w-48 z-50 overflow-hidden"
            >
              {menuItem === "main" && (
                <div className="py-2">
                  <button
                    onClick={() => setMenuItem("info")}
                    className="w-full px-4 py-2 text-sm hover:bg-zinc-800 text-left flex items-center gap-2"
                  >
                    <span>ℹ️</span> Information
                  </button>
                  <button
                    onClick={() => setMenuItem("theme")}
                    className="w-full px-4 py-2 text-sm hover:bg-zinc-800 text-left flex items-center gap-2"
                  >
                    <span>🎨</span> Theme
                  </button>
                  <button
                    onClick={() => setMenuItem("credits")}
                    className="w-full px-4 py-2 text-sm hover:bg-zinc-800 text-left flex items-center gap-2"
                  >
                    <span>⭐</span> Credits
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full px-4 py-2 text-sm hover:bg-red-900/30 text-left flex items-center gap-2 text-red-400"
                  >
                    <Trash2 size={16} /> Delete Chat
                  </button>
                </div>
              )}

              {menuItem === "info" && (
                <div className="p-4 space-y-3">
                  <button onClick={() => setMenuItem("main")} className="text-xs text-zinc-400 hover:text-white mb-2">← Back</button>
                  <p className="font-semibold mb-2">About {companion.name}</p>
                  <p className="text-xs mb-3">Role: <span className="capitalize font-medium text-white">{companion.role}</span></p>
                  <p className="text-xs mb-3">Age: <span className="font-medium text-white">{companion.age}</span></p>
                  <p className="text-xs">Nationality: <span className="font-medium text-white">{companion.nationality}</span></p>
                </div>
              )}

              {menuItem === "credits" && (
                <div className="p-4 space-y-3">
                  <button onClick={() => setMenuItem("main")} className="text-xs text-zinc-400 hover:text-white mb-2">← Back</button>
                  <p className="font-semibold">Credits Usage</p>
                  <div className="bg-zinc-800 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Today</span>
                      <span className="text-white font-medium">{usage} / {limit}</span>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(usage / limit) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Total Lifetime</span>
                      <span className="text-white font-medium">{getTotalCredits()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">Your {tier.toUpperCase()} plan allows {limit} daily credits</p>
                </div>
              )}

              {menuItem === "theme" && (
                <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
                  <button onClick={() => setMenuItem("main")} className="text-xs text-zinc-400 hover:text-white">← Back</button>
                  <p className="font-semibold text-sm">Choose Theme</p>
                  <div className="grid grid-cols-2 gap-2">
                    {THEMES.map((t) => {
                      const isLocked = t.locked && tier === "free";
                      const isSelected = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => !isLocked && handleThemeSelect(t.id)}
                          disabled={isLocked}
                          className={`p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                            isSelected
                              ? "border-blue-500 bg-blue-500/20"
                              : "border-zinc-700 hover:border-zinc-600"
                          } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <div className={`h-8 rounded mb-1 ${t.userBg}`} />
                          <div className="flex items-center justify-center gap-1">
                            {t.name}
                            {isLocked && <span className="text-[10px]">🔒</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {tier === "free" && (
                    <p className="text-xs text-amber-500 text-center">Upgrade to PRO to unlock premium themes</p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-semibold mb-2">Start talking to {companion.name}!</p>
            <p className="text-xs text-zinc-400">Begin a conversation with your companion</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            {msg.replyTo && (
              <div className="flex gap-2 mb-2 ml-0 mb-1">
                <div className="text-xs text-zinc-500 ml-0 flex items-center gap-1">
                  <Reply size={12} />
                  Replying to {msg.replyTo.sender === "user" ? "You" : companion.name}
                </div>
              </div>
            )}
            
            <div className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} group relative`}>
              {msg.sender === "ai" && (
                <Avatar className="w-8 h-8 mr-3 flex-shrink-0 self-end">
                  <AvatarImage src={companion.avatar} className="object-cover" />
                  <AvatarFallback>{companion.name[0]}</AvatarFallback>
                </Avatar>
              )}
              
              <div className="relative">
                <div
                  className={`max-w-sm px-4 py-2.5 rounded-3xl relative group/msg text-white ${
                    msg.sender === "user"
                      ? `${currentTheme?.userBg} rounded-br-none`
                      : `${currentTheme?.companionBg} rounded-bl-none`
                  }`}
                >
                  <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                  <p className="text-[10px] opacity-60 mt-1 text-right">
                    {format(new Date(msg.timestamp), "HH:mm")}
                  </p>
                </div>

                <button
                  onClick={() => setActiveReactionMessage(activeReactionMessage === msg.id ? null : msg.id)}
                  className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-800 rounded"
                >
                  <MoreVertical size={16} className="text-zinc-500" />
                </button>

                <AnimatePresence>
                  {activeReactionMessage === msg.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: -10 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute -top-12 right-0 bg-zinc-900 border border-zinc-700 rounded-lg p-2 flex gap-2 z-50"
                    >
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="hover:bg-zinc-800 p-1 rounded text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="hover:bg-zinc-800 p-1 rounded text-sm text-zinc-400 ml-1"
                      >
                        Reply
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {Object.entries(msg.reactions).map(([key, emoji]) => (
                      <span key={key} className="text-sm">{emoji as string}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className="h-1" />
      </div>

      {/* Reply To Indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            <p className="mb-1">Replying to {replyingTo.sender === "user" ? "You" : companion.name}</p>
            <p className="text-zinc-500 italic truncate">{replyingTo.text}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-black/80 backdrop-blur-md border-t border-white/10">
        <div className={`flex items-center gap-3 ${currentTheme?.inputBg} rounded-full px-4 py-3 border border-white/10`}>
          <button className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            currentTheme?.id === "default" ? "bg-blue-600 text-white" :
            currentTheme?.id === "sunset" ? "bg-orange-600 text-white" :
            currentTheme?.id === "ocean" ? "bg-cyan-600 text-white" :
            currentTheme?.id === "forest" ? "bg-green-600 text-white" :
            currentTheme?.id === "neon" ? "bg-pink-600 text-white" :
            currentTheme?.id === "aurora" ? "bg-blue-600 text-white" :
            currentTheme?.id === "fire" ? "bg-red-600 text-white" :
            currentTheme?.id === "midnight" ? "bg-slate-700 text-white" :
            currentTheme?.id === "cotton-candy" ? "bg-pink-600 text-white" :
            currentTheme?.id === "cyberpunk" ? "bg-cyan-600 text-white" :
            currentTheme?.id === "mint" ? "bg-teal-600 text-white" :
            currentTheme?.id === "berry" ? "bg-rose-600 text-white" :
            "bg-blue-600 text-white"
          } hover:opacity-80`}>
            <Camera size={18} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Message..."
            className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-sm"
          />
          <button onClick={handleSend} className={`flex-shrink-0 ${currentTheme?.buttonColor} hover:opacity-80`} data-testid="button-send">
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-80"
            >
              <h3 className="text-lg font-semibold mb-2">Delete Chat?</h3>
              <p className="text-sm text-zinc-400 mb-6">This will delete all messages with {companion.name}. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteChat}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
