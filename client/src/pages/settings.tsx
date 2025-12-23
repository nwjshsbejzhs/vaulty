import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { ChevronLeft, Bell, Lock, Shield, HelpCircle, LogOut, Moon, Globe, DollarSign, Check, EyeOff, Camera, MessageSquare } from "lucide-react";
import { useCurrency, type CurrencyCode } from "@/contexts/currency-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user, signOut } = useAuth();
  const [location, setLocation] = useLocation();
  const { currency, setCurrency } = useCurrency();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [privateFollowing, setPrivateFollowing] = useState(false);
  const [profileZoomBlock, setProfileZoomBlock] = useState(false);
  const [messageRequestsEnabled, setMessageRequestsEnabled] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPrivateFollowing(data.privateFollowingList || false);
          setProfileZoomBlock(data.profileZoomBlock || false);
          setMessageRequestsEnabled(data.messageRequestsEnabled !== false);
        }
      }
    };
    fetchSettings();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    setLocation("/login");
  };

  const togglePrivateFollowing = async (checked: boolean) => {
    if (!user) return;
    setPrivateFollowing(checked);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        privateFollowingList: checked
      });
      toast({
        title: checked ? "Privacy Enabled" : "Privacy Disabled",
        description: checked ? "Your following list is now hidden from others." : "Your following list is now visible to everyone."
      });
    } catch (error) {
      console.error("Error updating privacy:", error);
      setPrivateFollowing(!checked);
      toast({
        title: "Error",
        description: "Failed to update privacy settings.",
        variant: "destructive"
      });
    }
  };

  const toggleProfileZoomBlock = async (checked: boolean) => {
    if (!user) return;
    setProfileZoomBlock(checked);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        profileZoomBlock: checked
      });
      toast({
        title: checked ? "Zoom Block Enabled" : "Zoom Block Disabled",
        description: checked ? "Profile picture zooming is now blocked." : "Profile picture zooming is now allowed."
      });
    } catch (error) {
      console.error("Error updating zoom block:", error);
      setProfileZoomBlock(!checked);
      toast({
        title: "Error",
        description: "Failed to update settings.",
        variant: "destructive"
      });
    }
  };

  const toggleMessageRequests = async (checked: boolean) => {
    if (!user) return;
    setMessageRequestsEnabled(checked);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        messageRequestsEnabled: checked
      });
      toast({
        title: checked ? "Message Requests Enabled" : "Message Requests Disabled",
        description: checked ? "You will receive message requests from users." : "Message requests are disabled."
      });
    } catch (error) {
      console.error("Error updating message requests:", error);
      setMessageRequestsEnabled(!checked);
      toast({
        title: "Error",
        description: "Failed to update settings.",
        variant: "destructive"
      });
    }
  };

  const currencies: { code: CurrencyCode; label: string; symbol: string }[] = [
    { code: "USD", label: "US Dollar", symbol: "$" },
    { code: "EUR", label: "Euro", symbol: "€" },
    { code: "GBP", label: "British Pound", symbol: "£" },
    { code: "JPY", label: "Japanese Yen", symbol: "¥" },
    { code: "AUD", label: "Australian Dollar", symbol: "A$" },
    { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  ];

  const sections = [
    {
      title: "Account",
      items: [
        { icon: Bell, label: "Notifications", value: "On", action: () => {} },
        { 
          icon: EyeOff, 
          label: "Private Following List", 
          isToggle: true,
          checked: privateFollowing,
          onCheckedChange: togglePrivateFollowing
        },
        { 
          icon: Camera, 
          label: "Block Profile Zoom", 
          isToggle: true,
          checked: profileZoomBlock,
          onCheckedChange: toggleProfileZoomBlock
        },
        { 
          icon: MessageSquare, 
          label: "Message Requests", 
          isToggle: true,
          checked: messageRequestsEnabled,
          onCheckedChange: toggleMessageRequests
        },
        { icon: Shield, label: "Security", value: "", action: () => {} },
      ]
    },
    {
      title: "Preferences",
      items: [
        { icon: Moon, label: "Dark Mode", value: "System", action: () => {} },
        { icon: Globe, label: "Language", value: "English", action: () => {} },
        { 
          icon: DollarSign, 
          label: "Currency", 
          value: currency, 
          action: () => setCurrencyOpen(true) 
        },
      ]
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help Center", value: "", action: () => setLocation("/support") },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <button onClick={() => setLocation("/profile")} className="p-2 hover:bg-white/10 rounded-full">
             <ChevronLeft size={24} />
           </button>
           <h1 className="font-bold text-lg">Settings</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-md mx-auto">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            <h2 className="text-gray-500 font-bold text-sm uppercase tracking-wider px-2">{section.title}</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {section.items.map((item: any, idx) => (
                <div 
                  key={item.label} 
                  onClick={item.action}
                  className={`flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-colors ${idx !== section.items.length - 1 ? "border-b border-white/5" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} className="text-gray-400" />
                    <span>{item.label}</span>
                  </div>
                  
                  {item.isToggle ? (
                    <Switch 
                      checked={item.checked} 
                      onCheckedChange={item.onCheckedChange}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <span className="text-sm">{item.value}</span>
                      <ChevronLeft size={16} className="rotate-180" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <button 
          onClick={handleSignOut}
          className="w-full p-4 bg-red-500/10 border border-red-500/20 text-red-500 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
        >
          <LogOut size={20} />
          Sign Out
        </button>
        
        <p className="text-center text-xs text-gray-600 pt-4">
          Version 1.0.0 • Vaulty
        </p>
      </div>

      <Dialog open={currencyOpen} onOpenChange={setCurrencyOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white w-[90%] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Select Currency</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 mt-4">
            {currencies.map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  setCurrency(c.code);
                  setCurrencyOpen(false);
                }}
                className={`w-full p-4 rounded-xl flex items-center justify-between transition-colors ${
                  currency === c.code 
                    ? "bg-cyan-500/20 text-cyan-400" 
                    : "hover:bg-white/5 text-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold w-8 text-center bg-white/5 rounded-lg py-1">{c.symbol}</span>
                  <span>{c.label} ({c.code})</span>
                </div>
                {currency === c.code && <Check size={18} />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
