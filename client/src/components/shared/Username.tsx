import { getRank } from "@/lib/ranks";
import { cn } from "@/lib/utils";

interface UsernameProps {
  name: string;
  xp?: number; // Optional, if we want to calculate rank
  rankId?: string; // Optional, if we already know the rank
  className?: string;
  showRankIcon?: boolean;
}

export function Username({ name, xp = 0, className, showRankIcon = false, useDefaultColor = false }: UsernameProps & { useDefaultColor?: boolean }) {
  const rank = getRank(xp);
  
  const isGlowing = rank.glow;
  const isMaster = rank.id === 'master';
  
  // If useDefaultColor is true, we strip all rank styling
  if (useDefaultColor) {
    return (
      <span className={cn("font-bold transition-colors duration-300 flex items-center gap-1.5", className)}>
        {showRankIcon && (
          <img src={rank.imagePath} alt={rank.name} className="w-4 h-4 object-contain" />
        )}
        {name}
      </span>
    );
  }

  return (
    <span 
      className={cn(
        "font-bold transition-colors duration-300 flex items-center gap-1.5",
        isMaster ? "text-rainbow" : "",
        className
      )}
      style={!isMaster ? { 
        color: rank.color,
        textShadow: isGlowing ? `0 0 10px ${rank.color}, 0 0 20px ${rank.color}` : 'none'
      } : undefined}
    >
      {showRankIcon && (
        <img src={rank.imagePath} alt={rank.name} className="w-4 h-4 object-contain" />
      )}
      {name}
    </span>
  );
}
