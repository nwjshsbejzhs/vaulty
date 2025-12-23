import { useAuth } from "@/contexts/auth-context";
import { Link } from "wouter";
import { formatPoints } from "@/lib/utils";
import { VaultyIcon } from "@/components/ui/vaulty-icon";

export function PointsBalanceCard() {
  const { user, userData } = useAuth();
  
  // Use user points from Firestore data or default to 0
  const points = userData?.vaultyPoints || 0;

  if (!user) return null;

  return (
    <Link href="/shop">
      <div className="glass-card rounded-3xl p-6 hover:bg-white/10 transition-all cursor-pointer group relative overflow-hidden">
        {/* Abstract background blobs - Updated colors */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-pink-500/30 transition-colors" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 group-hover:bg-cyan-500/30 transition-colors" />

        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Total Balance</h2>
              <div className="flex items-center gap-3">
                <span className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-400">
                  {formatPoints(points)}
                </span>
                <VaultyIcon size={40} />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-400 group-hover:text-white transition-colors">
            <span>Tap to redeem rewards</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="translate-x-0 group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
