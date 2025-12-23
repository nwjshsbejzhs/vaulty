import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation, Link } from "wouter";
import { Settings, Info, Calendar, MapPin, Globe, Twitter, Instagram, LogOut, Grid, Heart, Edit2, Lock, TrendingUp } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { useToast } from "@/hooks/use-toast";
import { PointsBalanceCard } from "@/components/points-balance-card";
import { DailyGiftSection } from "@/components/daily-gift-section";
import { PostCard } from "@/components/post-card";
import { RankTab } from "@/components/profile/RankTab";

// Icons for scroll
import shopIcon from "@assets/6D8C3B21-C2D5-4F7C-84B8-1BE2AF208C70_1766145309438.png";
import goalsIcon from "@assets/6FFA4DC9-2AB3-4363-9FA9-E55F7E506612_1766145309438.png";
import academyIcon from "@assets/92F9DDCA-EF7B-462B-8D09-B7BEE7D6525B_1766145309438.png";
import leaderboardIcon from "@assets/B497626C-B5E2-47ED-A0ED-5529962CEDB8_1766145309438.png";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [userData, setUserData] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  
  useEffect(() => {
    // Real-time listener for user data
    if (user) {
      const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
        if (doc.exists()) {
            setUserData(doc.data());
        }
      });
      return () => unsub();
    }
  }, [user]);

  // Fetch user posts
  useEffect(() => {
    if (user) {
        const q = query(collection(db, "posts"), where("userId", "==", user.uid), orderBy("timestamp", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            setUserPosts(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
        });
        return () => unsub();
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    setLocation("/login");
  };

  if (!user) return null;

  const hasPro = userData?.badges?.includes("premium-pro") || userData?.badges?.includes("premium-ultra") || userData?.badges?.includes("premium-max");
  const customStyle = userData?.cardStyle ? {
      color: userData.cardStyle.color,
      scale: (userData.cardStyle.size || 100) / 100,
      animation: userData.cardStyle.animation
  } : undefined;

  const horizontalItems = [
      { label: "Goals", icon: goalsIcon, href: "/home/goals" },
      { label: "Shop", icon: shopIcon, href: "/shop" },
      { label: "Academy", icon: academyIcon, href: "/academy" },
      { label: "Leaderboard", icon: leaderboardIcon, href: "/home/leaderboard" },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header controls */}
      <div className="flex justify-between items-center p-4 z-20 relative">
         <div /> {/* Spacer */}
         <div className="flex gap-2">
           <button 
             onClick={() => setLocation("/edit-profile")}
             className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white border border-white/20 hover:bg-black/70 transition-colors flex items-center gap-1"
           >
             <Edit2 size={12} /> Edit
           </button>
           
           <button 
             onClick={() => setLocation("/settings")}
             className="bg-black/50 backdrop-blur-md p-2 rounded-full text-white border border-white/20 hover:bg-black/70 transition-colors"
           >
             <Settings size={16} />
           </button>
         </div>
      </div>

      <div className="p-4 pt-0 space-y-8">
        
        {/* Tabs */}
        <div className="flex gap-4 border-b border-zinc-800 px-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 px-2 font-semibold text-sm transition-colors ${
              activeTab === "overview"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("rank")}
            className={`pb-3 px-2 font-semibold text-sm transition-colors ${
              activeTab === "rank"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Rank
          </button>
          <button
            onClick={() => setActiveTab("card")}
            className={`pb-3 px-2 font-semibold text-sm transition-colors ${
              activeTab === "card"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Profile Card
          </button>
        </div>

        {/* Profile Card Tab */}
        {activeTab === "card" && (
          <div className="flex justify-center">
            <ProfileCard 
                user={userData || user} 
                isOwner={true} 
                hideControls={true} 
                customStyle={customStyle}
            />
          </div>
        )}

        {/* Rank Tab */}
        {activeTab === "rank" && (
          <RankTab />
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
        {/* 1. 3D Profile Card (removed from here) */}

        {/* 2. Overview / Balance / Motivation */}
        <div className="space-y-4">
            <div className="glass-card rounded-3xl p-6 relative overflow-hidden group border border-white/10 bg-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-pink-900/20 opacity-50" />
                <div className="relative z-10 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2 text-pink-400">
                    <TrendingUp size={16} />
                    <span className="text-xs font-bold tracking-wider uppercase">Motivation</span>
                    </div>
                    <p className="text-lg font-medium text-white italic">"Dream big, work hard, stay focused."</p>
                </div>
            </div>

            <PointsBalanceCard />
            <DailyGiftSection />
        </div>

        {/* 3. Horizontal Scrollable Cards */}
        <div className="space-y-2">
            <h3 className="text-sm font-bold text-gray-400 px-2 uppercase tracking-wider">More</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar snap-x">
                {horizontalItems.map((item, i) => (
                    <Link key={i} href={item.href}>
                        <div className="snap-center shrink-0 w-28 h-28 glass-card flex flex-col items-center justify-center p-4 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
                            {/* @ts-ignore - isEmoji check */}
                            {item.isEmoji ? (
                                <span className="text-3xl mb-2">{item.icon}</span>
                            ) : (
                                <img src={item.icon as string} className="w-10 h-10 mb-2 object-contain" alt={item.label} />
                            )}
                            <span className="text-xs font-bold text-white">{item.label}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>

        {/* 4. Portfolio Summary / Insights */}
        <div className="space-y-2">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Portfolio</h3>
                <Link href="/wallet">
                    <span className="text-xs text-cyan-400 font-bold cursor-pointer">Manage &rarr;</span>
                </Link>
             </div>
             
             {/* Simple Portfolio Summary Card */}
             <div className="glass-card p-5 rounded-3xl border border-white/10 bg-white/5">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 text-sm">Total Assets</span>
                    <span className="text-green-400 text-sm font-bold flex items-center gap-1">
                        <TrendingUp size={14} /> +2.5%
                    </span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">$0.00</div>
                <p className="text-xs text-gray-500">Start investing to see your portfolio grow.</p>
             </div>
        </div>

        {/* 5. My Posts */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 px-2 uppercase tracking-wider">My Posts</h3>
            <div className="grid grid-cols-1 gap-4">
                {userPosts.length > 0 ? (
                    userPosts.map(post => (
                        <PostCard key={post.id} post={post} currentUser={user} currentUserData={userData} />
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500 bg-white/5 rounded-2xl border border-white/10">
                        <p>No posts yet</p>
                    </div>
                )}
            </div>
        </div>
          </>
        )}

      </div>
    </div>
  );
}
