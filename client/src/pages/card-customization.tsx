import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { ChevronLeft, Lock, Palette, Zap, Check, Grid, Pipette } from "lucide-react";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function CardCustomization() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Customization State
  const [cardColor, setCardColor] = useState("default");
  const [customColor, setCustomColor] = useState("#333333");
  const [cardPattern, setCardPattern] = useState("none");
  const [cardAnimation, setCardAnimation] = useState("none");
  const [borderAnimationColor, setBorderAnimationColor] = useState("#ffffff");

  // Predefined colors
  const colorOptions = [
    { id: "default", value: "default", label: "Default" },
    { id: "red", value: "#ef4444", label: "Red" },
    { id: "blue", value: "#3b82f6", label: "Blue" },
    { id: "green", value: "#22c55e", label: "Green" },
    { id: "purple", value: "#a855f7", label: "Purple" },
    { id: "orange", value: "#f97316", label: "Orange" },
    { id: "pink", value: "#ec4899", label: "Pink" },
    { id: "black", value: "#000000", label: "Black" },
  ];

  const animationOptions = [
    { id: "none", label: "None" },
    { id: "shimmer", label: "Shimmer" },
    { id: "pulse", label: "Pulse" },
    { id: "rainbow", label: "Rainbow" },
    { id: "glow", label: "Glow" },
    { id: "border-beam", label: "Border Beam" },
    { id: "bounce", label: "Bounce" },
  ];

  const patternOptions = [
      { id: "none", label: "None" },
      { id: "hearts", label: "Hearts" },
      { id: "clouds", label: "Clouds" },
      { id: "stars", label: "Stars" },
      { id: "dots", label: "Dots" },
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            // Load saved customization
            if (data.cardStyle) {
                setCardColor(data.cardStyle.color || "default");
                if (data.cardStyle.color && data.cardStyle.color !== "default") {
                    setCustomColor(data.cardStyle.color);
                }
                setCardPattern(data.cardStyle.pattern || "none");
                setCardAnimation(data.cardStyle.animation || "none");
                setBorderAnimationColor(data.cardStyle.borderAnimationColor || "#ffffff");
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchUserData();
  }, [user]);

  if (loading) return null;

  const hasPro = userData?.badges?.includes("premium-pro") || userData?.badges?.includes("premium-ultra") || userData?.badges?.includes("premium-max");

  if (!hasPro) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
          <Lock size={32} className="text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Customization Locked</h1>
        <p className="text-gray-400 mb-8 max-w-sm">
          Card customization is available exclusively for PRO, ULTRA, and MAX members.
        </p>
        <div className="flex gap-4">
          <button 
            onClick={() => setLocation("/profile")}
            className="px-6 py-2 rounded-full border border-white/20 font-bold hover:bg-white/10"
          >
            Go Back
          </button>
          <button 
            onClick={() => setLocation("/premium")}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold hover:brightness-110"
          >
            Upgrade to PRO
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!user) return;
    try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            cardStyle: {
                color: cardColor,
                pattern: cardPattern,
                animation: cardAnimation,
                borderAnimationColor: borderAnimationColor
            }
        });
        toast({
            title: "Changes Saved",
            description: "Your card customization has been updated.",
        });
        setLocation("/profile");
    } catch (e) {
        console.error("Error saving customization:", e);
        toast({
            title: "Error",
            description: "Could not save changes. Please try again.",
            variant: "destructive"
        });
    }
  };

  // Preview user object with customization overrides
  const previewUser = {
    ...userData,
    cardStyle: {
        color: cardColor,
        pattern: cardPattern,
        animation: cardAnimation,
        borderColor: borderAnimationColor
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <button onClick={() => setLocation("/profile")} className="p-2 hover:bg-white/10 rounded-full">
             <ChevronLeft size={24} />
           </button>
           <h1 className="font-bold text-lg">Customize Card</h1>
        </div>
        <button 
          onClick={handleSave}
          className="px-4 py-2 bg-white text-black font-bold rounded-full flex items-center gap-2 hover:bg-gray-200"
        >
          <Check size={16} /> Save
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 p-6 overflow-hidden">
        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center bg-white/5 rounded-3xl border border-white/10 p-8 min-h-[600px] overflow-hidden relative">
          <div className="absolute top-4 left-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Live Preview</div>
          <div className="transform transition-all duration-300 w-[340px]">
             <ProfileCard 
                user={previewUser} 
                isOwner={true} 
                hideControls={true} 
                customStyle={{
                    color: cardColor,
                    pattern: cardPattern,
                    animation: cardAnimation,
                    borderColor: borderAnimationColor
                }}
             />
          </div>
        </div>

        {/* Controls Area */}
        <div className="w-full lg:w-96 space-y-8 h-full overflow-y-auto pr-2">
          
          {/* Colors */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-bold">
              <Palette size={20} className="text-cyan-400" />
              <h3>Card Color</h3>
            </div>
            
            {/* Custom Color Picker */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase">Custom Hex Color</label>
                <div className="flex gap-3">
                    <input 
                        type="color" 
                        value={customColor}
                        onChange={(e) => {
                            setCustomColor(e.target.value);
                            setCardColor(e.target.value);
                        }}
                        className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input 
                        type="text" 
                        value={customColor}
                        onChange={(e) => {
                            setCustomColor(e.target.value);
                            setCardColor(e.target.value);
                        }}
                        className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 font-mono text-sm uppercase"
                    />
                </div>
            </div>

            {/* Presets */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
               {colorOptions.map(color => (
                 <button
                   key={color.id}
                   onClick={() => {
                       setCardColor(color.value);
                       if (color.value !== "default") {
                           setCustomColor(color.value);
                       }
                   }}
                   className={`shrink-0 w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center ${cardColor === color.value ? 'border-white scale-110 shadow-lg shadow-white/20' : 'border-white/10 hover:border-white/30'}`}
                   style={{ backgroundColor: color.value === "default" ? "transparent" : color.value }}
                   title={color.label}
                 >
                     {color.value === "default" && <span className="text-xs font-bold text-gray-400">DEF</span>}
                 </button>
               ))}
            </div>
          </div>

          {/* Patterns */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-bold">
              <Grid size={20} className="text-green-400" />
              <h3>Patterns</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
               {patternOptions.map(pattern => (
                 <button
                   key={pattern.id}
                   onClick={() => setCardPattern(pattern.id)}
                   className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${cardPattern === pattern.id ? 'border-green-400 bg-green-500/20 text-white' : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-400'}`}
                 >
                   {pattern.label}
                 </button>
               ))}
            </div>
          </div>

          {/* Animations */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-bold">
              <Zap size={20} className="text-purple-400" />
              <h3>Animation Effect</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
               {animationOptions.map(anim => (
                 <button
                   key={anim.id}
                   onClick={() => setCardAnimation(anim.id)}
                   className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${cardAnimation === anim.id ? 'border-purple-400 bg-purple-500/20 text-white' : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-400'}`}
                 >
                   {anim.label}
                 </button>
               ))}
            </div>
          </div>

          {/* Border Beam Color Picker - Only shown when "border-beam" is selected */}
          {cardAnimation === 'border-beam' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-2 text-lg font-bold">
                  <Pipette size={20} className="text-yellow-400" />
                  <h3>Border Beam Color</h3>
                </div>
                
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="flex gap-3">
                        <input 
                            type="color" 
                            value={borderAnimationColor}
                            onChange={(e) => setBorderAnimationColor(e.target.value)}
                            className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input 
                            type="text" 
                            value={borderAnimationColor}
                            onChange={(e) => setBorderAnimationColor(e.target.value)}
                            className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 font-mono text-sm uppercase"
                        />
                    </div>
                </div>
              </div>
          )}

        </div>
      </div>
    </div>
  );
}
