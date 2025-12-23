import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Gift, Play, Share2, Users, Calendar, Check, Lock, Star, Copy, CheckCheck } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRewards } from "@/hooks/use-rewards";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { VaultyIcon } from "@/components/ui/vaulty-icon";

export default function Quests() {
  const [location, setLocation] = useLocation();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const { claimDailyLogin, watchVideo, shareOnTwitter, inviteFriend, loading } = useRewards();
  
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate a simple promo code from UID (first 6 chars uppercase)
  const promoCode = user ? user.uid.substring(0, 6).toUpperCase() : "VAULTY";

  const copyPromoCode = () => {
      navigator.clipboard.writeText(promoCode);
      setCopied(true);
      toast({
          title: "Copy successful",
          description: "Promo code copied to clipboard",
          className: "bg-green-500 border-none text-white"
      });
      setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteClick = () => {
      setInviteOpen(true);
      inviteFriend(); // Just to track if we wanted, but logic is mainly UI
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <h1 className="font-bold text-lg">Quests & Challenges</h1>
        </div>
        <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
            <VaultyIcon size={14} />
            <span className="text-yellow-500 font-bold text-xs">{(userData?.vaultyPoints || 0).toFixed(2)} VP</span>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-md mx-auto">
        
        {/* Daily Section */}
        <section>
          <h2 className="text-gray-400 font-bold text-sm uppercase tracking-wider mb-3 px-1">Daily Tasks</h2>
          <div className="space-y-3">
            
            {/* Daily Login */}
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg text-green-500">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Daily Login</h3>
                            <p className="text-xs text-gray-400">+2 VP • +50 XP</p>
                        </div>
                    </div>
                    <Button 
                        size="sm" 
                        onClick={claimDailyLogin}
                        disabled={userData?.lastDailyLogin === new Date().toISOString().split('T')[0] || loading}
                        className={userData?.lastDailyLogin === new Date().toISOString().split('T')[0] ? "bg-white/10 text-gray-500" : "bg-green-600 hover:bg-green-700"}
                    >
                        {userData?.lastDailyLogin === new Date().toISOString().split('T')[0] ? <Check size={16} /> : "Claim"}
                    </Button>
                </CardContent>
            </Card>

            {/* Watch Videos */}
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500">
                                <Play size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Watch Videos</h3>
                                <p className="text-xs text-gray-400">0.2-1 VP • +50 XP per video</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-white/5 border-white/10">
                            {userData?.VideoCount || 0}/10
                        </Badge>
                    </div>
                    <Progress value={((userData?.VideoCount || 0) / 10) * 100} className="h-1.5 bg-white/10 mb-3" />
                    <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700" 
                        onClick={watchVideo}
                        // disabled={(userData?.VideoCount || 0) >= 10 || loading}
                    >
                        Watch Video
                    </Button>
                </CardContent>
            </Card>

            {/* Share on Twitter */}
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-sky-500/20 rounded-lg text-sky-500">
                                <Share2 size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Share on Twitter</h3>
                                <p className="text-xs text-gray-400">+10 VP • +10 XP</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-white/5 border-white/10">
                            {userData?.TwitterCount || 0}/5
                        </Badge>
                    </div>
                    <Button 
                        className="w-full bg-sky-600 hover:bg-sky-700" 
                        onClick={shareOnTwitter}
                        disabled={(userData?.TwitterCount || 0) >= 5 || loading}
                    >
                        {(userData?.TwitterCount || 0) >= 5 ? "Daily Limit Reached" : "Share"}
                    </Button>
                </CardContent>
            </Card>

          </div>
        </section>

        {/* Growth Section */}
        <section>
          <h2 className="text-gray-400 font-bold text-sm uppercase tracking-wider mb-3 px-1">Growth & Social</h2>
          <div className="space-y-3">
            
            {/* Invite Friend */}
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-500">
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Invite Friend</h3>
                            <p className="text-xs text-gray-400">+5 VP • +100 XP (On Register)</p>
                        </div>
                    </div>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={handleInviteClick}>
                        Invite
                    </Button>
                </CardContent>
            </Card>

            {/* Likes (Passive) */}
            <Card className="bg-white/5 border-white/10 opacity-80">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-pink-500/20 rounded-lg text-pink-500">
                            <Star size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Get Likes on Posts</h3>
                            <p className="text-xs text-gray-400">+1 VP • +10 XP per 5 likes</p>
                        </div>
                    </div>
                    <div className="text-xs text-center p-2 bg-white/5 rounded mt-2">
                        Passive Earning • Current Likes: {userData?.likesReceived || 0}
                    </div>
                </CardContent>
            </Card>

          </div>
        </section>

      </div>

      {/* Invite Friend Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-[#111] border border-white/10 text-white rounded-3xl w-[90%] max-w-sm">
            <DialogHeader>
                <DialogTitle className="text-center text-xl font-bold">Invite Friends</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
                <div className="text-center text-gray-400 text-sm">
                    Share your unique promo code with friends. You'll both earn rewards when they register!
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase tracking-widest">Your Promo Code</span>
                    <div className="text-3xl font-mono font-bold text-cyan-400 tracking-wider">
                        {promoCode}
                    </div>
                </div>

                <Button 
                    onClick={copyPromoCode}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 font-bold h-12 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                    {copied ? <CheckCheck className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {copied ? "Copy Successful" : "Copy Code"}
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
