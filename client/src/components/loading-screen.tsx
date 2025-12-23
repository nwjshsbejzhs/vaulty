import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import vaultyLogo from "@/assets/vaulty_logo_christmas.png"; // Import the logo

interface LoadingScreenProps {
  onComplete?: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Force at least 5 seconds of loading as requested
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white animate-in fade-in duration-300">
      <div className="relative flex flex-col items-center justify-center space-y-8">
        <div className="relative w-32 h-32 md:w-40 md:h-40">
          <img 
            src={vaultyLogo} // Use imported logo
            alt="Vaulty Logo" 
            className="relative w-full h-full object-contain"
          />
        </div>
        
        <div className="w-48 h-1 bg-gray-900 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-pink-500 w-full animate-progress origin-left" 
               style={{ animation: "progress 5s ease-in-out infinite" }}
          />
        </div>
      </div>

      <div className="absolute bottom-10 text-center">
        <p className="text-gray-500 text-sm font-medium tracking-wider uppercase">
          Powered by Vaulty Group
        </p>
      </div>

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
