import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useGlobalNotification } from "@/contexts/global-notification-context";
import { isAdmin, isSuperAdmin } from "@/lib/admins";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, User, Ban, Coins, FileText, Bell, Search, Trash2, ChevronLeft, ChevronRight, Crown, Megaphone, Lock, MessageCircle, Star, Ghost, Trophy, ExternalLink, Zap } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, addDoc, getDocs, query, where, orderBy, limit, deleteDoc, collectionGroup } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RANKS, getRank } from "@/lib/ranks";
import { BADGES } from "@/lib/badges";
import { formatPoints } from "@/lib/utils";
import { VaultyIcon } from "@/components/ui/vaulty-icon";

export function AdminMenu() {
  const { user, userData, updateUserBadges } = useAuth();
  const { addNotification } = useGlobalNotification();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [targetUser, setTargetUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pointsAmount, setPointsAmount] = useState("");
  const [xpAmount, setXpAmount] = useState("");
  const [notificationMsg, setNotificationMsg] = useState("");
  const [globalNotificationMsg, setGlobalNotificationMsg] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRank, setSelectedRank] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  const [usersList, setUsersList] = useState<any[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState("");
  const [promoPlan, setPromoPlan] = useState("All");
  const [promoDuration, setPromoDuration] = useState("1week");
  const [customDays, setCustomDays] = useState("");
  const [activePromoCodes, setActivePromoCodes] = useState<any[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);

  const isSuper = user ? isSuperAdmin(user.email) : false;
  const isAuthorized = user && (userData?.isAdmin || isSuper);

  useEffect(() => {
    if (isOpen && isAuthorized) {
      fetchUsers();
      if (isSuper) {
        fetchPromoCodes();
      }
    }
  }, [isOpen, isAuthorized]);

  if (!isAuthorized) return null;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsersList(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ title: "Failed to fetch users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = usersList.filter(u => 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectUser = (selectedUser: any) => {
    setTargetUser(selectedUser);
    setShowPassword(false);
    fetchLogs(selectedUser.id);
  };

  const handleBackToList = () => {
    setTargetUser(null);
    setLogs([]);
    setShowPassword(false);
  };

  const fetchLogs = async (userId: string) => {
    try {
      // Fetch Posts
      const postsQuery = query(collection(db, "posts"), where("userId", "==", userId), orderBy("timestamp", "desc"), limit(20));
      const postsSnapshot = await getDocs(postsQuery);
      const postLogs = postsSnapshot.docs.map(d => ({
        id: d.id,
        type: "post",
        content: `Posted: "${d.data().content}"`,
        timestamp: d.data().timestamp,
        icon: <FileText className="h-4 w-4 text-blue-400" />
      }));

      // Fetch Messages (using collectionGroup)
      const messagesQuery = query(collectionGroup(db, "messages"), where("senderId", "==", userId), orderBy("timestamp", "desc"), limit(20));
      const messagesSnapshot = await getDocs(messagesQuery);
      const messageLogs = messagesSnapshot.docs.map(d => ({
        id: d.id,
        type: "message",
        content: `Sent message: "${d.data().text || '[Image]'}"`,
        timestamp: d.data().timestamp,
        icon: <MessageCircle className="h-4 w-4 text-green-400" />
      }));

      // Combine and Sort
      const allLogs = [...postLogs, ...messageLogs].sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });

      setLogs(allLogs);
    } catch (e) {
      console.log("No logs found or error", e);
      // Fallback if collectionGroup index is missing or fails, just show posts
      try {
         const postsQuery = query(collection(db, "posts"), where("userId", "==", userId), orderBy("timestamp", "desc"), limit(20));
         const postsSnapshot = await getDocs(postsQuery);
         const postLogs = postsSnapshot.docs.map(d => ({
            id: d.id,
            type: "post",
            content: `Posted: "${d.data().content}"`,
            timestamp: d.data().timestamp,
            icon: <FileText className="h-4 w-4 text-blue-400" />
         }));
         setLogs(postLogs);
      } catch (innerError) {
          setLogs([]);
      }
    }
  };

  const handleToggleBadge = async (badgeId: string) => {
      if (!targetUser) return;
      if (!isSuper) {
          toast({ title: "You Don't Have Permissions For This Action!", variant: "destructive" });
          return;
      }
      
      const currentBadges = targetUser.badges || [];
      let newBadges;
      
      if (currentBadges.includes(badgeId)) {
          newBadges = currentBadges.filter((b: string) => b !== badgeId);
          toast({ title: "Badge removed" });
      } else {
          newBadges = [...currentBadges, badgeId];
          toast({ title: "Badge awarded!" });
      }
      
      try {
          await updateUserBadges(targetUser.id, newBadges);
          // Update local state
          const updatedUser = { ...targetUser, badges: newBadges };
          setTargetUser(updatedUser);
          setUsersList(usersList.map(u => u.id === targetUser.id ? updatedUser : u));
      } catch (error) {
          toast({ title: "Failed to update badges", variant: "destructive" });
      }
  };

  const handleBanUser = async () => {
    if (!targetUser) return;
    try {
      const newStatus = !targetUser.isBanned;
      
      await updateDoc(doc(db, "users", targetUser.id), {
        isBanned: newStatus
      });

      // Update local state for immediate feedback
      setTargetUser({ ...targetUser, isBanned: newStatus });
      setUsersList(usersList.map(u => u.id === targetUser.id ? { ...u, isBanned: newStatus } : u));
      
      toast({ title: `User ${newStatus ? "Banned" : "Unbanned"} successfully` });
    } catch (error) {
      toast({ title: "Failed to update ban status", variant: "destructive" });
    }
  };

  const handleGhostUser = async () => {
    if (!targetUser) return;
    if (!isSuper) {
        toast({ title: "You Don't Have Permissions For This Action!", variant: "destructive" });
        return;
    }
    try {
        const newStatus = !targetUser.isGhost;
        
        await updateDoc(doc(db, "users", targetUser.id), {
            isGhost: newStatus
        });

        // Update local state
        setTargetUser({ ...targetUser, isGhost: newStatus });
        setUsersList(usersList.map(u => u.id === targetUser.id ? { ...u, isGhost: newStatus } : u));

        toast({ 
            title: `User ${newStatus ? "Ghosted" : "Un-Ghosted"}`,
            description: newStatus ? "User hidden from leaderboard and profile." : "User visible again."
        });
    } catch (error) {
        toast({ title: "Failed to update ghost status", variant: "destructive" });
    }
  };

  const handleDeleteUser = async () => {
    if (!targetUser) return;
    if (!isSuper) {
      toast({ title: "You Don't Have Permissions For This Action!", variant: "destructive" });
      return;
    }
    if (!confirm("⚠️ DANGER: This will PERMANENTLY DELETE this user account and ALL their data. This CANNOT be undone.\n\nType 'DELETE' to confirm.")) return;

    try {
      await deleteDoc(doc(db, "users", targetUser.id));
      
      setUsersList(usersList.filter(u => u.id !== targetUser.id));
      setTargetUser(null);
      
      toast({ title: "User deleted successfully" });
    } catch (error) {
      toast({ title: "Failed to delete user", variant: "destructive" });
    }
  };

  const handleSetAdmin = async () => {
    if (!targetUser) return;
    if (!isSuper) {
      toast({ title: "You Don't Have Permissions For This Action!", variant: "destructive" });
      return;
    }
    try {
        const newAdminStatus = !targetUser.isAdmin;
        await updateDoc(doc(db, "users", targetUser.id), {
            isAdmin: newAdminStatus
        });
        const updatedUser = { ...targetUser, isAdmin: newAdminStatus };
        setTargetUser(updatedUser);
        const newList = usersList.map(u => u.id === targetUser.id ? { ...u, isAdmin: newAdminStatus } : u);
        setUsersList(newList);
        toast({ title: `User ${newAdminStatus ? "promoted to Admin" : "demoted from Admin"}` });
    } catch (error) {
        toast({ title: "Failed to update admin status", variant: "destructive" });
    }
  };

  const handleUpdatePoints = async (action: 'add' | 'remove') => {
    if (!targetUser || !pointsAmount) return;
    if (!isSuper) {
      toast({ title: "You Don't Have Permissions For This Action!", variant: "destructive" });
      return;
    }
    const amount = parseInt(pointsAmount);
    if (isNaN(amount)) return;

    try {
      const currentPoints = targetUser.vaultyPoints || 0;
      const newPoints = action === 'add' ? currentPoints + amount : Math.max(0, currentPoints - amount);
      
      await updateDoc(doc(db, "users", targetUser.id), {
        vaultyPoints: newPoints
      });

      // Update local state
      setTargetUser({ ...targetUser, vaultyPoints: newPoints });
      setUsersList(usersList.map(u => u.id === targetUser.id ? { ...u, vaultyPoints: newPoints } : u));

      toast({ title: "Vaulty Points updated successfully" });
      setPointsAmount("");
    } catch (error) {
      toast({ title: "Failed to update points", variant: "destructive" });
    }
  };

  const handleUpdateXP = async (action: 'add' | 'remove') => {
    if (!targetUser || !xpAmount) return;
    if (!isSuper) {
      toast({ title: "You Don't Have Permissions For This Action!", variant: "destructive" });
      return;
    }
    const amount = parseInt(xpAmount);
    if (isNaN(amount)) return;

    try {
      const currentXP = targetUser.xp || 0;
      const newXP = action === 'add' ? currentXP + amount : Math.max(0, currentXP - amount);
      
      await updateDoc(doc(db, "users", targetUser.id), {
        xp: newXP
      });

      // Update local state
      setTargetUser({ ...targetUser, xp: newXP });
      setUsersList(usersList.map(u => u.id === targetUser.id ? { ...u, xp: newXP } : u));

      toast({ title: "XP updated successfully" });
      setXpAmount("");
    } catch (error) {
      toast({ title: "Failed to update XP", variant: "destructive" });
    }
  };

  const handleSetRank = async (rankId: string) => {
    if (!targetUser) return;
    if (!isSuper) {
      toast({ title: "You Don't Have Permissions For This Action!", variant: "destructive" });
      return;
    }
    const rank = RANKS.find(r => r.id === rankId);
    if (!rank) return;

    try {
        await updateDoc(doc(db, "users", targetUser.id), {
            xp: rank.minXP
        });
        
        // Update local state
        setTargetUser({ ...targetUser, xp: rank.minXP });
        setUsersList(usersList.map(u => u.id === targetUser.id ? { ...u, xp: rank.minXP } : u));
        setSelectedRank("");
        
        toast({ title: `User rank set to ${rank.name}` });
    } catch (error) {
        toast({ title: "Failed to update rank", variant: "destructive" });
    }
  };

  const handleSetPlan = async (plan: string) => {
    if (!targetUser) return;
    if (!isSuper) {
      toast({ title: "You Don't Have Permissions For This Action!", variant: "destructive" });
      return;
    }
    if (!plan || plan === "") {
      toast({ title: "Please select a plan first", variant: "destructive" });
      return;
    }

    try {
        const updateData: any = {};
        let newBadges = [...(targetUser.badges || [])];
        
        // Remove all premium badges first
        newBadges = newBadges.filter((b: string) => !b.includes("premium"));
        
        console.log("handleSetPlan called with:", plan);
        
        if (plan === "none") {
            console.log("Removing plan - setting premiumPlan to null");
            updateData.premiumPlan = null;
            updateData.premiumExpiry = null;
        } else {
            console.log("Setting plan to:", plan);
            updateData.premiumPlan = plan;
            // Set expiry to 30 days from now
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            updateData.premiumExpiry = expiryDate;
            
            // Add appropriate premium badge
            if (plan === "PRO") {
                newBadges.push("premium-pro");
            } else if (plan === "ULTRA") {
                newBadges.push("premium-ultra");
            } else if (plan === "MAX") {
                newBadges.push("premium-max");
            }
        }
        
        updateData.badges = newBadges;
        
        console.log("Final updateData to Firebase:", updateData);
        await updateDoc(doc(db, "users", targetUser.id), updateData);
        console.log("Plan update successful");
        
        // Update local state
        const updatedUser = { ...targetUser, ...updateData };
        setTargetUser(updatedUser);
        setUsersList(usersList.map(u => u.id === targetUser.id ? updatedUser : u));
        setSelectedPlan("");
        
        toast({ 
            title: plan === "none" ? "Plan removed successfully" : `Plan set to ${plan}`,
            description: plan !== "none" ? "Expires in 30 days" : "User is now on Free tier"
        });
    } catch (error) {
        console.error("Error updating plan:", error);
        toast({ title: "Failed to update plan", variant: "destructive" });
    }
  };

  const handleGoToProfile = () => {
    if (!targetUser) return;
    setIsOpen(false);
    setLocation(`/user/${targetUser.id}`);
  };

  const handleSendNotification = async () => {
    if (!targetUser || !notificationMsg) return;
    try {
      await addDoc(collection(db, "users", targetUser.id, "notifications"), {
        message: notificationMsg,
        timestamp: new Date(),
        read: false,
        type: "admin_alert"
      });
      
      toast({ title: "Notification sent" });
      setNotificationMsg("");
    } catch (error) {
      toast({ title: "Failed to send notification", variant: "destructive" });
    }
  };

  const handleSendGlobalNotification = async () => {
      if (!isSuper || !globalNotificationMsg) return;
      try {
          const [title, ...descParts] = globalNotificationMsg.split('\n');
          const description = descParts.join('\n').trim();
          
          await addDoc(collection(db, "global_notifications"), {
              message: title,
              description: description || undefined,
              timestamp: new Date(),
              type: "global_alert"
          });
          // Show to sender immediately
          addNotification(title, description, 'info', 5000);
          toast({ title: "Global notification broadcasted!" });
          setGlobalNotificationMsg("");
      } catch (error) {
          toast({ title: "Failed to broadcast", variant: "destructive" });
      }
  };

  const fetchPromoCodes = async () => {
    try {
      const promoSnapshot = await getDocs(collection(db, "promo_codes"));
      const promos = promoSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivePromoCodes(promos);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
    }
  };

  const handleCreatePromoCode = async () => {
    if (!isSuper) {
      toast({ title: "You Don't Have Permissions For This Action!", variant: "destructive" });
      return;
    }
    if (!promoCode.trim() || !promoDiscount) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    setPromoLoading(true);
    try {
      const discountNum = parseInt(promoDiscount);
      if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
        toast({ title: "Discount must be 0-100", variant: "destructive" });
        setPromoLoading(false);
        return;
      }

      let expiresAt: Date | null = null;
      if (promoDuration === "1day") expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
      else if (promoDuration === "1week") expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      else if (promoDuration === "1month") expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      else if (promoDuration === "custom") {
        const days = parseInt(customDays);
        if (isNaN(days) || days <= 0) {
          toast({ title: "Enter valid number of days", variant: "destructive" });
          setPromoLoading(false);
          return;
        }
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }

      await addDoc(collection(db, "promo_codes"), {
        code: promoCode.toUpperCase(),
        discount: discountNum,
        plan: promoPlan,
        expiresAt: expiresAt,
        createdAt: new Date(),
        active: true
      });

      toast({ title: "Promo code created!", description: `${promoCode.toUpperCase()} - ${discountNum}% off` });
      setPromoCode("");
      setPromoDiscount("");
      setPromoPlan("All");
      setPromoDuration("1week");
      setCustomDays("");
      fetchPromoCodes();
    } catch (error) {
      console.error("Error creating promo code:", error);
      toast({ title: "Failed to create promo code", variant: "destructive" });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleDeletePromoCode = async (id: string) => {
    if (!isSuper) {
      toast({ title: "You Don't Have Permissions For This Action!", variant: "destructive" });
      return;
    }
    try {
      await deleteDoc(doc(db, "promo_codes", id));
      toast({ title: "Promo code deleted" });
      fetchPromoCodes();
    } catch (error) {
      toast({ title: "Failed to delete promo code", variant: "destructive" });
    }
  };
  
  const totalUsers = usersList.length;
  const totalVaultyCredits = usersList.reduce((acc, curr) => acc + (curr.vaultyPoints || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className={`fixed right-0 top-1/2 -translate-y-1/2 z-[9999] rounded-l-xl rounded-r-none h-12 w-12 ${isSuper ? "bg-amber-500 hover:bg-amber-600" : "bg-red-600 hover:bg-red-700"} shadow-lg border-l border-y border-white/20`}
          size="icon"
        >
          {isSuper ? <Crown className="h-6 w-6 text-white" /> : <Shield className="h-6 w-6 text-white" />}
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-2xl bg-[#0a0a0a] border-white/10 text-white max-h-[90vh] h-[800px] overflow-hidden flex flex-col z-[10000] p-0 gap-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-2 border-b border-white/10 bg-[#111]">
          <DialogTitle className={`flex items-center gap-2 text-xl font-bold ${isSuper ? "text-amber-500" : "text-red-500"}`}>
            {isSuper ? <Crown className="h-6 w-6" /> : <Shield className="h-6 w-6" />} 
            {isSuper ? "Super Admin Dashboard" : "Admin Dashboard"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {!targetUser ? (
            /* USER LIST VIEW */
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-white/10 bg-[#0a0a0a] space-y-4">
                
                {/* Stats Block */}
                <div className="flex gap-4">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Total Users</div>
                        <div className="text-2xl font-bold text-white">{totalUsers}</div>
                    </div>
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Total Vaulty Credits Balance</div>
                        <div className="text-2xl font-bold text-cyan-400 font-mono">
                             <VaultyIcon className="inline mr-1" size={18} />
                             {formatPoints(totalVaultyCredits)}
                        </div>
                    </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input 
                    placeholder="Search users by name..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#1a1a1a] border-white/10 pl-9"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                {isSuper && (
                    <div className="flex gap-2">
                         <Input 
                            placeholder="Send Global Notification (e.g. Follow us on IG!)" 
                            value={globalNotificationMsg}
                            onChange={(e) => setGlobalNotificationMsg(e.target.value)}
                            className="bg-[#1a1a1a] border-amber-500/30 focus:border-amber-500"
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                        <Button onClick={handleSendGlobalNotification} className="bg-amber-500 hover:bg-amber-600 text-black">
                            <Megaphone className="h-4 w-4" />
                        </Button>
                    </div>
                )}
              </div>
              
              <ScrollArea className="flex-1 p-4">
                <div className="grid gap-2">
                  {loading ? (
                    <div className="text-center py-10 text-gray-500">
                      <p>Loading users...</p>
                    </div>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => (
                      <div 
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-white/10 overflow-hidden">
                            <img src={u.photoURL || "https://github.com/shadcn.png"} alt={u.displayName} className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white group-hover:text-red-400 transition-colors flex items-center gap-1">
                                {u.displayName || "Unknown User"}
                                {u.isAdmin && <Shield className="h-3 w-3 text-red-500" fill="currentColor" />}
                            </h4>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {u.isBanned && (
                            <Badge variant="destructive" className="bg-red-500/20 text-red-500 hover:bg-red-500/20">BANNED</Badge>
                          )}
                          {u.isGhost && (
                            <Ghost className="h-4 w-4 text-gray-500" />
                          )}
                          <div className="flex items-center gap-1 text-cyan-400 text-xs font-bold bg-cyan-950/30 px-2 py-1 rounded">
                            <VaultyIcon size={12} />
                            {formatPoints(u.vaultyPoints)}
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-gray-500">
                      <p>No users found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            /* USER DETAIL VIEW */
            <div className="flex flex-col h-full bg-[#0a0a0a]">
              <div className="p-4 border-b border-white/10 flex items-center gap-2 bg-[#0a0a0a]">
                <Button variant="ghost" size="sm" onClick={handleBackToList} className="text-gray-400 hover:text-white">
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <div className="h-6 w-[1px] bg-white/10 mx-2" />
                <h3 className="font-bold flex items-center gap-2">
                    {targetUser.displayName}
                    {targetUser.isAdmin && <Shield className="h-3 w-3 text-red-500" fill="currentColor" />}
                </h3>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-8">
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button 
                        variant="outline" 
                        onClick={handleBanUser}
                        className={`${targetUser.isBanned ? "bg-red-500/20 text-red-500 border-red-500/50" : "bg-white/5 border-white/10"} hover:bg-white/10`}
                    >
                        <Ban className="mr-2 h-4 w-4" />
                        {targetUser.isBanned ? "Unban User" : "Ban User"}
                    </Button>

                    <Button 
                        variant="outline" 
                        onClick={handleGhostUser}
                        className={`${targetUser.isGhost ? "bg-purple-500/20 text-purple-500 border-purple-500/50" : "bg-white/5 border-white/10"} hover:bg-white/10`}
                    >
                        <Ghost className="mr-2 h-4 w-4" />
                        {targetUser.isGhost ? "Un-Ghost" : "Ghost User"}
                    </Button>

                    <Button 
                        variant="outline" 
                        onClick={handleDeleteUser}
                        className="bg-white/5 border-white/10 hover:bg-red-950/30 hover:text-red-500 hover:border-red-900/50"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                    </Button>
                    
                    <Button 
                        variant="outline" 
                        onClick={handleSetAdmin}
                        className={`${targetUser.isAdmin ? "bg-red-500/20 text-red-500 border-red-500/50" : "bg-white/5 border-white/10"} hover:bg-white/10`}
                    >
                        <Shield className="mr-2 h-4 w-4" />
                        {targetUser.isAdmin ? "Revoke Admin" : "Make Admin"}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleGoToProfile}
                        className="bg-white/5 border-white/10 hover:bg-white/10 col-span-2 md:col-span-4"
                    >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Public Profile
                    </Button>
                  </div>

                  {/* Stats Edit */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="font-bold flex items-center gap-2">
                            <Coins className="h-4 w-4 text-cyan-400" /> 
                            Manage Points
                        </h4>
                        <div className="text-2xl font-mono text-cyan-400 font-bold mb-2">
                            {formatPoints(targetUser.vaultyPoints)} VP
                        </div>
                        <div className="flex gap-2">
                            <Input 
                                type="number" 
                                placeholder="Amount" 
                                value={pointsAmount}
                                onChange={(e) => setPointsAmount(e.target.value)}
                                className="bg-black/50 border-white/10"
                            />
                            <Button size="sm" onClick={() => handleUpdatePoints('add')} className="bg-green-600 hover:bg-green-700">+</Button>
                            <Button size="sm" onClick={() => handleUpdatePoints('remove')} className="bg-red-600 hover:bg-red-700">-</Button>
                        </div>
                    </div>

                    <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="font-bold flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-400" /> 
                            Manage XP / Rank
                        </h4>
                        <div className="flex items-center justify-between mb-2">
                             <div className="text-2xl font-mono text-yellow-400 font-bold">
                                {targetUser.xp || 0} XP
                             </div>
                             <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
                                {getRank(targetUser.xp || 0).name}
                             </Badge>
                        </div>
                        
                        <div className="flex gap-2 mb-4">
                            <Input 
                                type="number" 
                                placeholder="Amount" 
                                value={xpAmount}
                                onChange={(e) => setXpAmount(e.target.value)}
                                className="bg-black/50 border-white/10"
                            />
                            <Button size="sm" onClick={() => handleUpdateXP('add')} className="bg-green-600 hover:bg-green-700">+</Button>
                            <Button size="sm" onClick={() => handleUpdateXP('remove')} className="bg-red-600 hover:bg-red-700">-</Button>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <label className="text-xs text-gray-500 mb-2 block uppercase font-bold">Set Rank Directly</label>
                            <div className="flex gap-2">
                                <select 
                                    className="bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm flex-1 outline-none"
                                    value={selectedRank}
                                    onChange={(e) => setSelectedRank(e.target.value)}
                                >
                                    <option value="">Select Rank...</option>
                                    {RANKS.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} ({r.minXP} XP)</option>
                                    ))}
                                </select>
                                <Button 
                                    size="sm" 
                                    disabled={!selectedRank}
                                    onClick={() => handleSetRank(selectedRank)}
                                >
                                    Set
                                </Button>
                            </div>
                        </div>
                    </div>
                  </div>

                  {/* Notification */}
                  <div className="space-y-2">
                    <h4 className="font-bold flex items-center gap-2">
                        <Bell className="h-4 w-4" /> Send Notification
                    </h4>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Message..." 
                            value={notificationMsg}
                            onChange={(e) => setNotificationMsg(e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                        <Button onClick={handleSendNotification}>Send</Button>
                    </div>
                  </div>

                  {/* User Data */}
                  <div className="grid md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <h4 className="font-bold text-gray-500 uppercase text-xs tracking-wider">User Details</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between p-3 rounded bg-white/5">
                                <span className="text-gray-400">User ID</span>
                                <span className="font-mono text-xs select-all">{targetUser.id}</span>
                            </div>
                            <div className="flex justify-between p-3 rounded bg-white/5">
                                <span className="text-gray-400">Email</span>
                                <span className="select-all">{targetUser.email}</span>
                            </div>
                            <div className="flex justify-between p-3 rounded bg-white/5">
                                <span className="text-gray-400">Password</span>
                                <span 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="cursor-pointer hover:text-white transition-colors"
                                >
                                    {showPassword ? targetUser.password : "••••••••"}
                                </span>
                            </div>
                            <div className="flex justify-between p-3 rounded bg-white/5">
                                <span className="text-gray-400">Joined</span>
                                <span>{targetUser.createdAt?.toDate ? targetUser.createdAt.toDate().toLocaleDateString() : 'Unknown'}</span>
                            </div>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <h4 className="font-bold text-gray-500 uppercase text-xs tracking-wider">Badges</h4>
                        <div className="flex flex-wrap gap-2">
                            {BADGES.map(badge => {
                                const hasBadge = targetUser.badges?.includes(badge.id);
                                return (
                                    <div 
                                        key={badge.id}
                                        onClick={() => handleToggleBadge(badge.id)}
                                        className={`
                                            p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2
                                            ${hasBadge ? "bg-white/10 border-white/20" : "opacity-50 border-transparent hover:opacity-100 bg-black/20"}
                                        `}
                                    >
                                        <img src={badge.image} className="w-6 h-6 object-contain" />
                                        <span className="text-xs">{badge.name}</span>
                                    </div>
                                )
                            })}
                        </div>
                     </div>
                  </div>

                   {/* PLAN MANAGEMENT SECTION */}
                   <div className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-white/10">
                        <h4 className="font-bold flex items-center gap-2 text-indigo-400">
                            <Zap className="h-4 w-4" /> 
                            Manage Plan / Subscription
                        </h4>
                        
                        <div className="flex items-center justify-between p-3 rounded bg-black/40 border border-white/5">
                             <div>
                                <span className="text-gray-400 text-sm block mb-1">Current Plan</span>
                                <span className="text-white font-bold text-lg">
                                    {targetUser.premiumPlan || "Free Tier"}
                                </span>
                             </div>
                             {targetUser.premiumExpiry && (
                                 <div className="text-right">
                                    <span className="text-gray-400 text-sm block mb-1">Expires</span>
                                    <span className="text-white font-mono text-sm">
                                        {targetUser.premiumExpiry.toDate ? targetUser.premiumExpiry.toDate().toLocaleDateString() : new Date(targetUser.premiumExpiry.seconds * 1000).toLocaleDateString()}
                                    </span>
                                 </div>
                             )}
                        </div>

                        <div className="pt-2">
                            <label className="text-xs text-gray-500 mb-2 block uppercase font-bold">Set Plan Manually</label>
                            <div className="flex gap-2">
                                <select 
                                    className="bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm flex-1 outline-none"
                                    value={selectedPlan}
                                    onChange={(e) => setSelectedPlan(e.target.value)}
                                >
                                    <option value="">Select Action...</option>
                                    <option value="none">Remove Plan (Set to Free)</option>
                                    <option value="PRO">Give PRO Plan (30 days)</option>
                                    <option value="ULTRA">Give ULTRA Plan (30 days)</option>
                                    <option value="MAX">Give MAX Plan (30 days)</option>
                                </select>
                                <Button 
                                    size="sm" 
                                    disabled={!selectedPlan}
                                    onClick={() => handleSetPlan(selectedPlan)}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Update Plan
                                </Button>
                            </div>
                        </div>
                    </div>


                  {/* Activity Logs */}
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <h4 className="font-bold text-gray-500 uppercase text-xs tracking-wider">Recent Activity</h4>
                    <div className="space-y-2">
                        {logs.length > 0 ? (
                            logs.map((log) => (
                                <div key={log.id} className="text-sm p-3 rounded bg-white/5 border border-white/5 flex gap-3">
                                    <div className="mt-1">{log.icon}</div>
                                    <div>
                                        <div className="text-gray-300">{log.content}</div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "Just now"}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-gray-500 text-sm italic">No recent activity found.</div>
                        )}
                    </div>
                  </div>

                </div>
              </ScrollArea>
            </div>
          )}
        </div>
        
        {/* PROMO CODES TAB - SUPER ADMIN ONLY */}
        {isSuper && !targetUser && (
            <div className="border-t border-white/10 bg-[#0a0a0a] p-2">
                <Tabs defaultValue="users" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 bg-[#1a1a1a]">
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="promos">Promo Codes</TabsTrigger>
                    </TabsList>
                    
                    {/* Just to handle switching views if needed, effectively we are showing Users by default above */}
                    <TabsContent value="users" className="hidden"></TabsContent> 
                    
                    <TabsContent value="promos" className="p-4 h-[600px] overflow-y-auto absolute bottom-0 left-0 w-full bg-[#0a0a0a] z-20 top-[60px]">
                        <div className="space-y-6">
                            <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-amber-500" />
                                    Create Promo Code
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 uppercase">Code</label>
                                        <Input 
                                            placeholder="e.g. SUMMER2024" 
                                            value={promoCode}
                                            onChange={(e) => setPromoCode(e.target.value)}
                                            className="uppercase bg-black/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 uppercase">Discount %</label>
                                        <Input 
                                            type="number"
                                            placeholder="0-100" 
                                            value={promoDiscount}
                                            onChange={(e) => setPromoDiscount(e.target.value)}
                                            className="bg-black/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 uppercase">Plan</label>
                                        <select 
                                            className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm outline-none"
                                            value={promoPlan}
                                            onChange={(e) => setPromoPlan(e.target.value)}
                                        >
                                            <option value="All">All Plans</option>
                                            <option value="PRO">Pro Only</option>
                                            <option value="ULTRA">Ultra Only</option>
                                            <option value="MAX">Max Only</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 uppercase">Duration</label>
                                        <select 
                                            className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm outline-none"
                                            value={promoDuration}
                                            onChange={(e) => setPromoDuration(e.target.value)}
                                        >
                                            <option value="1week">1 Week</option>
                                            <option value="1month">1 Month</option>
                                            <option value="1day">24 Hours</option>
                                            <option value="custom">Custom Days</option>
                                        </select>
                                    </div>
                                    {promoDuration === "custom" && (
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-xs text-gray-500 uppercase">Days</label>
                                            <Input 
                                                type="number"
                                                placeholder="Number of days" 
                                                value={customDays}
                                                onChange={(e) => setCustomDays(e.target.value)}
                                                className="bg-black/50"
                                            />
                                        </div>
                                    )}
                                </div>
                                <Button 
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
                                    onClick={handleCreatePromoCode}
                                    disabled={promoLoading}
                                >
                                    {promoLoading ? "Creating..." : "Create Promo Code"}
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider">Active Codes</h3>
                                <div className="space-y-2">
                                    {activePromoCodes.length > 0 ? (
                                        activePromoCodes.map(promo => (
                                            <div key={promo.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-lg text-white">{promo.code}</span>
                                                        <Badge className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/20">
                                                            -{promo.discount}%
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Applies to: {promo.plan} • Expires: {promo.expiresAt?.toDate().toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="hover:bg-red-500/20 hover:text-red-500"
                                                    onClick={() => handleDeletePromoCode(promo.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-500 italic">
                                            No active promo codes
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
