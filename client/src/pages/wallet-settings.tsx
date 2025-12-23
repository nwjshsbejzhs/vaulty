import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Lock, Smartphone, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export default function WalletSettingsPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  useEffect(() => {
    if (userData) {
      setIsFaceIdEnabled(userData.isFaceIdEnabled || false);
    }
  }, [userData]);

  const handleFaceIdToggle = async (checked: boolean) => {
    if (!user) return;
    try {
      setIsFaceIdEnabled(checked);
      await updateDoc(doc(db, "users", user.uid), {
        isFaceIdEnabled: checked
      });
      toast({ title: checked ? "Face ID Enabled" : "Face ID Disabled" });
    } catch (e) {
      console.error(e);
      setIsFaceIdEnabled(!checked); // Revert
      toast({ title: "Failed to update settings", variant: "destructive" });
    }
  };

  const handleChangePin = async () => {
    if (!user) return;
    
    // Validate Current PIN (if one exists)
    if (userData.walletPin && currentPin !== userData.walletPin) {
      toast({ title: "Incorrect current PIN", variant: "destructive" });
      return;
    }

    // Validate New PIN
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      toast({ title: "PIN must be 4 digits", variant: "destructive" });
      return;
    }

    if (newPin !== confirmPin) {
      toast({ title: "New PINs do not match", variant: "destructive" });
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        walletPin: newPin
      });
      toast({ title: "PIN Updated Successfully" });
      setChangingPin(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to update PIN", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-md mx-auto p-4 flex items-center gap-4">
          <Link href="/wallet">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Wallet Settings</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto pt-20 px-4 space-y-6">
        
        {/* Face ID Setting */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-white">Face ID</h3>
                    <p className="text-xs text-gray-400">Unlock wallet with biometrics</p>
                </div>
            </div>
            <Switch 
                checked={isFaceIdEnabled}
                onCheckedChange={handleFaceIdToggle}
            />
        </div>

        {/* Change PIN Setting */}
        <div className="space-y-4">
            {!changingPin ? (
                <button 
                    onClick={() => setChangingPin(true)}
                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-white">{userData?.walletPin ? "Change PIN" : "Set PIN"}</h3>
                            <p className="text-xs text-gray-400">Manage your 4-digit security PIN</p>
                        </div>
                    </div>
                    <ArrowLeft className="w-5 h-5 rotate-180 text-gray-500" />
                </button>
            ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white">Update Security PIN</h3>
                        <Button variant="ghost" size="sm" onClick={() => setChangingPin(false)} className="h-6 w-6 p-0 rounded-full">
                            <XCircle className="w-5 h-5 text-gray-500" />
                        </Button>
                    </div>

                    {userData?.walletPin && (
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 ml-1">Current PIN</label>
                            <Input 
                                type="password" 
                                maxLength={4} 
                                placeholder="Enter current 4-digit PIN"
                                className="bg-black/50 border-white/10 text-center tracking-[1em] font-mono text-lg"
                                value={currentPin}
                                onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 ml-1">New PIN</label>
                        <Input 
                            type="password" 
                            maxLength={4} 
                            placeholder="Enter new 4-digit PIN"
                            className="bg-black/50 border-white/10 text-center tracking-[1em] font-mono text-lg"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 ml-1">Confirm New PIN</label>
                        <Input 
                            type="password" 
                            maxLength={4} 
                            placeholder="Confirm new 4-digit PIN"
                            className="bg-black/50 border-white/10 text-center tracking-[1em] font-mono text-lg"
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                        />
                    </div>

                    <Button 
                        className="w-full bg-cyan-600 hover:bg-cyan-700 font-bold"
                        onClick={handleChangePin}
                    >
                        Save PIN
                    </Button>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}
