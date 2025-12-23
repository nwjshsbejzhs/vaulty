import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  History, 
  Wallet, 
  CreditCard,
  ChevronRight,
  Settings,
  Lock,
  Loader2,
  Smartphone,
  Delete
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import creditsIcon from "@assets/IMG_8153_1766009087571.png";
import { cn, formatPoints } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { doc, collection, query, orderBy, limit, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DemoBalanceCard } from "@/components/demo-balance-card"; // Imported DemoBalanceCard

const PACKAGES = [
  { credits: 1000, price: 8.99, label: "Starter" },
  { credits: 2500, price: 19.99, label: "Pro" },
  { credits: 5000, price: 39.99, label: "Ultra" },
  { credits: 10000, price: 79.99, label: "Max" },
];

export default function WalletPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Security State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [setupPin, setSetupPin] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Data State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Initial Auth Check
  useEffect(() => {
    if (userData) {
      if (!userData.walletPin) {
        setShowSetup(true);
      } else {
        // PIN is set, check for Face ID
        if (userData.isFaceIdEnabled) {
          authenticateFaceId();
        }
      }
    }
  }, [userData]);

  const authenticateFaceId = () => {
    setIsAuthenticating(true);
    // Simulate Face ID delay
    setTimeout(() => {
      setIsAuthenticating(false);
      setIsUnlocked(true);
      toast({ title: "Authenticated with Face ID" });
    }, 1500);
  };

  const handlePinDigit = (digit: string) => {
    if (pinInput.length < 4) {
        const newPin = pinInput + digit;
        setPinInput(newPin);
        
        // Auto submit on 4th digit
        if (newPin.length === 4) {
            validatePin(newPin);
        }
    }
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const validatePin = (pin: string) => {
    if (pin === userData?.walletPin) {
      setIsUnlocked(true);
      toast({ title: "Wallet Unlocked" });
    } else {
      toast({ title: "Incorrect PIN", variant: "destructive" });
      setPinInput("");
    }
  };

  const handleSetupSubmit = async () => {
    if (setupPin.length !== 4) {
      toast({ title: "PIN must be 4 digits", variant: "destructive" });
      return;
    }
    if (setupPin !== setupConfirm) {
      toast({ title: "PINs do not match", variant: "destructive" });
      return;
    }
    
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        walletPin: setupPin,
        isFaceIdEnabled: false // Default off
      });
      setShowSetup(false);
      setIsUnlocked(true);
      toast({ title: "Wallet PIN set successfully!" });
    } catch (e) {
      toast({ title: "Failed to save PIN", variant: "destructive" });
    }
  };

  // Fetch Transactions
  useEffect(() => {
    if (user && isUnlocked) {
      const fetchTransactions = async () => {
        setLoadingTx(true);
        try {
          // Assuming a subcollection 'transactions' exists or creating a dummy fetch if empty
          // Since backend is not editable, we try to fetch. If empty, we mock for visual if user has no data.
          const q = query(collection(db, "users", user.uid, "transactions"), orderBy("timestamp", "desc"), limit(10));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
          } else {
             // If no real transactions, we keep empty or use a placeholder message
             setTransactions([]); 
          }
        } catch (e) {
          console.error("Error fetching transactions", e);
        } finally {
          setLoadingTx(false);
        }
      };
      
      fetchTransactions();
    }
  }, [user, isUnlocked]);


  const handleAction = () => {
    toast({
      title: "Coming Soon!",
      description: "Future Coming Soon... Is under construction!",
    });
  };

  const handlePurchase = () => {
    toast({
      title: "Purchase Unavailable",
      description: "Currently unavailable for purchase.",
      variant: "destructive",
    });
  };

  if (!userData) return null;

  // SETUP MODE
  if (showSetup) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto text-cyan-400 mb-4">
                    <Lock className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold">Set up Wallet PIN</h1>
                <p className="text-gray-400">Create a 4-digit PIN to secure your assets.</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase font-bold ml-1">Create PIN</label>
                    <Input 
                        type="password" 
                        maxLength={4}
                        value={setupPin}
                        onChange={(e) => setSetupPin(e.target.value.replace(/[^0-9]/g, ''))}
                        className="bg-white/5 border-white/10 text-center text-2xl tracking-[1em] h-14"
                        placeholder="••••"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase font-bold ml-1">Confirm PIN</label>
                    <Input 
                        type="password" 
                        maxLength={4}
                        value={setupConfirm}
                        onChange={(e) => setSetupConfirm(e.target.value.replace(/[^0-9]/g, ''))}
                        className="bg-white/5 border-white/10 text-center text-2xl tracking-[1em] h-14"
                        placeholder="••••"
                    />
                </div>
                <Button onClick={handleSetupSubmit} className="w-full h-12 text-lg font-bold bg-cyan-600 hover:bg-cyan-700">
                    Set PIN
                </Button>
            </div>
        </div>
      </div>
    );
  }

  // LOCKED MODE
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
         {/* Background Elements */}
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-900/10 to-black z-0 pointer-events-none" />
         <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

         <Link href="/home">
            <Button variant="ghost" size="icon" className="absolute top-6 left-6 text-gray-400 hover:text-white z-20">
              <ArrowLeft className="w-6 h-6" />
            </Button>
         </Link>

         {isAuthenticating ? (
             <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in z-10">
                 <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-cyan-500/30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <Smartphone className="w-12 h-12 text-cyan-400" />
                    </div>
                    <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                 </div>
                 <p className="text-cyan-400 font-medium tracking-wide">Face ID</p>
             </div>
         ) : (
            <div className="flex-1 flex flex-col items-center pt-24 pb-8 px-6 animate-in fade-in slide-in-from-bottom-8 duration-500 z-10">
                
                {/* Profile Section */}
                <div className="flex flex-col items-center gap-4 mb-12">
                    <Avatar className="w-24 h-24 border-4 border-white/10 shadow-2xl ring-4 ring-black/50">
                        <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-600 to-purple-600 text-2xl font-bold">
                            {user?.displayName?.charAt(0) || "U"}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div className="text-center space-y-1">
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            Hello, {user?.displayName?.split(' ')[0] || "User"}
                        </h1>
                        <p className="text-sm text-gray-400">Enter your PIN to access Vaulty</p>
                    </div>
                </div>

                {/* PIN Dots Display */}
                <div className="flex gap-4 mb-12">
                    {[0, 1, 2, 3].map((i) => (
                        <div 
                            key={i} 
                            className={cn(
                                "w-4 h-4 rounded-full transition-all duration-300",
                                i < pinInput.length 
                                    ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] scale-110" 
                                    : "bg-white/10 border border-white/10"
                            )}
                        />
                    ))}
                </div>

                {/* Spacer to push numpad down */}
                <div className="flex-1" />

                {/* Custom Number Pad */}
                <div className="w-full max-w-[320px] grid grid-cols-3 gap-x-8 gap-y-6 mb-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handlePinDigit(num.toString())}
                            className="w-16 h-16 rounded-full text-2xl font-medium text-white hover:bg-white/10 transition-colors flex items-center justify-center active:scale-95"
                        >
                            {num}
                        </button>
                    ))}
                    <div className="w-16 h-16" /> {/* Empty slot */}
                    <button
                        onClick={() => handlePinDigit("0")}
                        className="w-16 h-16 rounded-full text-2xl font-medium text-white hover:bg-white/10 transition-colors flex items-center justify-center active:scale-95"
                    >
                        0
                    </button>
                    <button
                        onClick={handleBackspace}
                        className="w-16 h-16 rounded-full text-white hover:bg-white/10 transition-colors flex items-center justify-center active:scale-95"
                    >
                        <Delete className="w-6 h-6" />
                    </button>
                </div>

                <div className="text-xs text-gray-500 font-medium cursor-pointer hover:text-white transition-colors">
                    Forgot PIN?
                </div>
            </div>
         )}
      </div>
    );
  }

  // UNLOCKED WALLET
  return (
    <div className="min-h-screen bg-black text-white pb-24 animate-in fade-in">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-md mx-auto p-4 flex items-center justify-between">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Vaulty Wallet</h1>
          <Link href="/wallet/settings">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <Settings className="w-6 h-6" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto pt-20 px-4 space-y-6">
        {/* Balance Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-white/10 p-6">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-black/50 border border-white/10 p-2 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <img src={creditsIcon} alt="Vaulty Credits" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Vaulty Credit Balance</p>
              <h2 className="text-4xl font-bold text-white mt-1">
                 {userData?.vaultyPoints ? userData.vaultyPoints.toLocaleString() : "0"}
              </h2>
            </div>
          </div>
        </div>

        {/* Invest Section (Moved from Home) */}
        <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Invest & Track</h3>
            <DemoBalanceCard />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={handleAction}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-300">Deposit</span>
          </button>
          
          <button 
            onClick={handleAction}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-300">Withdraw</span>
          </button>

          <button 
            onClick={handleAction}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-300">Exchange</span>
          </button>
        </div>

        {/* Credit Packages */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Top Up Credits</h3>
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">Secure Payment</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {PACKAGES.map((pkg, index) => (
              <button
                key={index}
                onClick={handlePurchase}
                className="relative group overflow-hidden rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 p-4 transition-all text-left active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10 flex flex-col h-full justify-between gap-3">
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                       <img src={creditsIcon} alt="C" className="w-5 h-5 object-contain" />
                    </div>
                    {index === 1 && <span className="text-[10px] font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-1.5 py-0.5 rounded-sm">POPULAR</span>}
                  </div>
                  
                  <div>
                    <p className="text-xl font-bold text-white">{pkg.credits}</p>
                    <p className="text-xs text-gray-400">Vaulty Credits</p>
                  </div>
                  
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="font-bold text-white">${pkg.price}</span>
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-400 hover:text-white">
              View All
            </Button>
          </div>

          <div className="space-y-2">
            {loadingTx ? (
              <div className="flex justify-center p-4">
                <Loader2 className="animate-spin text-gray-500" />
              </div>
            ) : transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      tx.type === 'deposit' ? "bg-green-500/10 text-green-400" :
                      tx.type === 'purchase' ? "bg-purple-500/10 text-purple-400" :
                      "bg-blue-500/10 text-blue-400"
                    )}>
                      {tx.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> :
                       tx.type === 'purchase' ? <CreditCard className="w-5 h-5" /> :
                       <RefreshCw className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{tx.title || "Transaction"}</p>
                      <p className="text-xs text-gray-500">
                        {tx.timestamp ? new Date(tx.timestamp.seconds * 1000).toLocaleDateString() : "Date Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-bold text-sm",
                      tx.amount > 0 ? "text-green-400" : "text-white"
                    )}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </p>
                    <p className="text-xs text-gray-500">Credits</p>
                  </div>
                </div>
              ))
            ) : (
                <div className="text-center p-6 text-gray-500 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-sm">No recent transactions</p>
                </div>
            )}
            
             <div onClick={handleAction} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-500/10 text-gray-400 flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">More history</p>
                    <p className="text-xs text-gray-500">Coming soon</p>
                  </div>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
