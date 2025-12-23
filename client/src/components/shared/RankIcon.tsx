import { Rank } from "@/lib/ranks";
import { cn } from "@/lib/utils";

interface RankIconProps {
  rank: Rank;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function RankIcon({ rank, size = "md", className }: RankIconProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-24 h-24"
  };

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
      <img 
        src={rank.imagePath} 
        alt={rank.name} 
        className={cn(
          "object-contain w-full h-full drop-shadow-md",
          rank.glow && "drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
        )}
      />
      {rank.glow && (
        <div 
          className="absolute inset-0 rounded-full blur-xl opacity-50 -z-10"
          style={{ backgroundColor: rank.color }}
        />
      )}
    </div>
  );
}
