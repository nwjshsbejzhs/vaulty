import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import QRCode from "react-qr-code";
import { Twitter, Instagram, Globe, X, Heart } from "lucide-react";
import { RankIcon } from "@/components/shared/RankIcon";
import { BADGES } from "@/lib/badges";
import { getRank } from "@/lib/ranks";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface ProfileCardProps {
  user: any;
  isOwner: boolean;
  onEdit?: () => void;
  onCustomize?: () => void;
  onBack?: () => void;
  onReport?: () => void;
  hideControls?: boolean;
  customStyle?: {
      color?: string;
      pattern?: string;
      animation?: string;
      borderColor?: string;
  };
}

// Function to determine if a color is light
const isLightColor = (color: string) => {
  if (!color || color === "default") return false;
  
  // Convert hex to RGB
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return true if luminance is high (light color)
  return luminance > 0.6; // Increased threshold for better contrast
};

import { VaultyIcon } from "@/components/ui/vaulty-icon";

export function ProfileCard({ user, isOwner, onEdit, onCustomize, onBack, onReport, hideControls = false, customStyle }: ProfileCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isLinksOpen, setIsLinksOpen] = useState(false);
  const { toast } = useToast();

  const xp = user?.xp || 0;
  const currentRank = getRank(xp);
  
  // Base rank class
  const rankClass = `rank-card-${currentRank.id}`;

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.profileZoomBlock) {
      setIsZoomOpen(true);
    }
  };

  const handleBadgeClick = (e: React.MouseEvent, badge: any) => {
    e.stopPropagation();
    toast({
      title: badge.name,
      description: badge.description,
    });
  };

  // Custom styles logic
  const cardStyle: React.CSSProperties = {};
  let isCustomLight = false;
  
  if (customStyle?.color && customStyle.color !== 'default') {
      cardStyle.background = customStyle.color;
      isCustomLight = isLightColor(customStyle.color);
      
      // Reset animation if a solid color is picked unless animation is forced
      if (customStyle.animation === 'none') {
          cardStyle.animation = 'none';
      }
  } else if (currentRank.id === 'silver' || currentRank.id === 'gold' || currentRank.id === 'master') {
      // Check if rank default colors are light (Silver, Gold, Master are usually light)
      // Master is rainbow but mostly light, Gold/Silver are light
      isCustomLight = true;
  }

  // Animation classes
  let animClass = "";
  if (customStyle?.animation) {
      switch (customStyle.animation) {
          case 'shimmer': animClass = "animate-shimmer bg-[length:200%_200%]"; break;
          case 'rainbow': animClass = "animate-rainbow bg-[length:200%_100%]"; break;
          case 'pulse': animClass = "animate-pulse"; break;
          case 'bounce': animClass = "animate-bounce"; break;
          case 'glow': 
              // Glow uses inline style now
              break;
          case 'border-beam':
              // Border beam handled separately
              break;
      }
  }

  // Pattern Class
  let patternClass = "";
  if (customStyle?.pattern && customStyle.pattern !== 'none') {
      patternClass = `pattern-${customStyle.pattern}`;
  }

  // Special Effects (Glow)
  if (customStyle?.animation === 'glow') {
      const glowColor = customStyle.color !== 'default' ? customStyle.color : currentRank.color;
      cardStyle.boxShadow = `0 0 30px ${glowColor || 'rgba(255,255,255,0.5)'}`;
  }

  const hasLinks = user?.links && Object.values(user.links).some(link => link && link !== "");

  // Text color class based on background brightness
  // Use explicit styles to override potentially conflicting utility classes
  const textStyle = { color: isCustomLight ? "black" : "white" };
  const borderColor = isCustomLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
  const profileBorderColor = isCustomLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)";
  
  const badgeStyle = { 
      backgroundColor: isCustomLight ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
      borderColor: isCustomLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"
  };

  const buttonStyle = {
      backgroundColor: isCustomLight ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)",
      color: isCustomLight ? "black" : "white",
      borderColor: isCustomLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"
  };

  // Sort badges: Premium badges go last
  const sortedBadges = user?.badges ? [...user.badges].sort((a, b) => {
      const isAPremium = a.includes("premium");
      const isBPremium = b.includes("premium");
      if (isAPremium && !isBPremium) return 1;
      if (!isAPremium && isBPremium) return -1;
      return 0;
  }) : [];

  return (
    <div className="w-full flex justify-center">
        <div className="w-full max-w-[340px] perspective-1000 h-[520px] relative">
        
        {/* The 3D Card */}
        <div 
            className={cn(
            "w-full h-full relative transition-transform duration-700 transform-style-3d cursor-pointer",
            isFlipped ? "rotate-y-180" : ""
            )}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            {/* Front Side */}
            <div 
                className={cn(
                    "absolute w-full h-full backface-hidden rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col items-center justify-start p-6 text-center border-4",
                    rankClass,
                    animClass,
                    patternClass
                )}
                style={{...cardStyle, borderColor: borderColor}}
            >

             {/* Follow / Heart Icon (Glass Style) */}
             <div className="absolute top-6 right-6 z-20 flex flex-col items-center gap-1 group">
                 <div className="glass-card p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg group-hover:scale-110 transition-transform">
                     <Heart size={20} className="text-white opacity-80" />
                 </div>
                 <span className="text-[10px] font-bold text-white/80 drop-shadow-md">
                     {user?.followers?.length || 0}
                 </span>
             </div>
            
            {/* Border Beam Effect */}
            {customStyle?.animation === 'border-beam' && (
                <div 
                    className="absolute inset-0 rounded-[2.5rem] pointer-events-none z-0 overflow-hidden"
                    style={{
                        padding: '4px' // Match border width
                    }}
                >
                    <div 
                        className="absolute inset-[-50%] w-[200%] h-[200%] animate-[spin_4s_linear_infinite]"
                        style={{
                            background: `conic-gradient(from 0deg, transparent 0 340deg, ${customStyle.borderColor || '#fff'} 360deg)`,
                            top: '-50%',
                            left: '-50%'
                        }}
                    />
                </div>
            )}

            {/* Rank Icon */}
            <div className="mt-8 mb-4 relative z-10">
                <RankIcon rank={currentRank} size="lg" className="w-14 h-14" />
            </div>

            {/* Profile Pic */}
            <div className="mb-4 relative z-10">
                <div 
                className={cn(
                    "w-28 h-28 rounded-full border-4 overflow-hidden shadow-xl cursor-zoom-in active:scale-95 transition-transform"
                )}
                style={{borderColor: profileBorderColor, backgroundColor: 'rgba(0,0,0,0.2)'}}
                onClick={handleProfileClick}
                >
                <img 
                    src={user?.photoURL || "https://github.com/shadcn.png"} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                />
                </div>
            </div>

            <h1 className="text-2xl font-bold mb-1 drop-shadow-md z-10 relative" style={textStyle}>
                {user?.displayName || "User"}
            </h1>
            
            <p className="text-sm opacity-80 font-medium mb-3 drop-shadow-sm z-10 relative" style={textStyle}>
                @{user?.username || user?.email?.split('@')[0]}
            </p>

            {/* Badges */}
            {sortedBadges.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-4 z-10 relative">
                {sortedBadges.map((badgeId: string) => {
                    const badge = BADGES.find(b => b.id === badgeId);
                    if (!badge) return null;
                    return (
                    <div 
                        key={badgeId} 
                        className={cn(
                            "w-8 h-8 rounded-full p-1 border backdrop-blur-sm hover:scale-110 transition-transform cursor-pointer"
                        )}
                        style={badgeStyle}
                        title={badge.name}
                        onClick={(e) => handleBadgeClick(e, badge)}
                    >
                        <img src={badge.image} alt={badge.name} className="w-full h-full object-contain" />
                    </div>
                    );
                })}
                </div>
            )}

            <p className="text-xs opacity-90 mb-6 max-w-[90%] leading-relaxed font-medium line-clamp-3 z-10 relative" style={textStyle}>
                {user?.bio || "No bio yet."}
            </p>

            {/* Social Buttons - Now "Find Me" */}
            <div className="w-full max-w-[180px] space-y-2 mt-auto mb-8 z-10 relative">
                {hasLinks && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsLinksOpen(true);
                    }}
                    className={cn(
                        "flex items-center justify-center gap-2 w-full backdrop-blur-sm py-2.5 rounded-full text-xs font-bold hover:scale-105 transition-transform border"
                    )}
                    style={buttonStyle}
                >
                    Find Me
                </button>
                )}
            </div>

            <div className="absolute bottom-4 text-[10px] opacity-50 font-mono uppercase tracking-widest z-10" style={textStyle}>
                made with Vaulty
            </div>
            </div>

            {/* Back Side (QR Code) - Now styled same as front */}
            <div 
                className={cn(
                    "absolute w-full h-full backface-hidden rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col items-center justify-center p-6 text-center border-4 rotate-y-180 z-[100]",
                    rankClass,
                    animClass,
                    patternClass
                )}
                style={{...cardStyle, borderColor: borderColor}}
            >
            <h2 className="text-xl font-bold mb-6 drop-shadow-md z-10 relative" style={textStyle}>Share with friends</h2>
            
            <div className="p-4 bg-white rounded-2xl shadow-xl border-2 border-gray-100 z-10 relative">
                <QRCode 
                value={`${window.location.origin}/user/${user?.uid}`} 
                size={160}
                viewBox={`0 0 256 256`}
                />
            </div>
            </div>
        </div>

        {/* Profile Zoom Modal */}
        <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
            <DialogContent className="bg-transparent border-none p-0 max-w-sm mx-auto flex items-center justify-center shadow-none outline-none [&>button]:hidden">
            <div className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl outline-none">
                <img 
                    src={user?.photoURL || "https://github.com/shadcn.png"} 
                    className="w-full h-full object-cover"
                    alt="Profile Zoomed"
                />
                <button 
                    onClick={() => setIsZoomOpen(false)}
                    className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 backdrop-blur-sm transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
            </DialogContent>
        </Dialog>

        {/* Links Modal */}
        <Dialog open={isLinksOpen} onOpenChange={setIsLinksOpen}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white p-6 max-w-sm mx-auto rounded-3xl">
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-center mb-2">Find me on</h2>
                    
                    {user?.links?.instagram && (
                    <a 
                        href={user.links.instagram.startsWith('http') ? user.links.instagram : `https://${user.links.instagram}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Instagram className="text-pink-500" size={20} />
                            <span className="font-medium">Instagram</span>
                        </div>
                        <div className="text-zinc-500 text-sm">Open</div>
                    </a>
                    )}
                    
                    {user?.links?.twitter && (
                    <a 
                        href={user.links.twitter.startsWith('http') ? user.links.twitter : `https://${user.links.twitter}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Twitter className="text-blue-400" size={20} />
                            <span className="font-medium">X (Twitter)</span>
                        </div>
                        <div className="text-zinc-500 text-sm">Open</div>
                    </a>
                    )}

                    {user?.links?.website && (
                    <a 
                        href={user.links.website.startsWith('http') ? user.links.website : `https://${user.links.website}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Globe className="text-emerald-400" size={20} />
                            <span className="font-medium">Website</span>
                        </div>
                        <div className="text-zinc-500 text-sm">Open</div>
                    </a>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    </div>
    </div>
  );
}
