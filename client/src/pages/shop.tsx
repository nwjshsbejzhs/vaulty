import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { ChevronLeft, Loader2 } from "lucide-react";
import { formatPoints } from "@/lib/utils";
import { VaultyIcon } from "@/components/ui/vaulty-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

import appleLogo from "@assets/IMG_7663_1765467955491.png";
import googlePlayLogo from "@assets/IMG_7664_1765467955492.png";
import paypalLogo from "@assets/IMG_7666_1765467967536.png";

interface PaymentProvider {
  id: string;
  name: string;
  image: string;
  description: string;
}

const PAYMENT_PROVIDERS: PaymentProvider[] = [
  {
    id: "paypal",
    name: "PayPal",
    image: paypalLogo,
    description: "Redeem PayPal Gift Cards"
  },
  {
    id: "appstore",
    name: "App Store",
    image: appleLogo,
    description: "Redeem Apple App Store Gift Cards"
  },
  {
    id: "googleplay",
    name: "Google Play",
    image: googlePlayLogo,
    description: "Redeem Google Play Store Gift Cards"
  }
];

const PACKAGE_OPTIONS = [
  { usd: 5, vc: 500 },
  { usd: 10, vc: 1000 },
  { usd: 20, vc: 2000 },
  { usd: 50, vc: 5000 }
];

export default function Shop() {
  const { user, userData } = useAuth();
  const [location, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<typeof PACKAGE_OPTIONS[0] | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const { toast } = useToast();

  const handleProviderClick = (provider: PaymentProvider) => {
    setSelectedProvider(provider);
    setDialogOpen(true);
  };

  const handleRedeem = async (packageOption: typeof PACKAGE_OPTIONS[0]) => {
    if (!selectedProvider || !user || !userData) return;

    // Check if user has enough credits
    if ((userData?.vaultyPoints || 0) < packageOption.vc) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${packageOption.vc.toLocaleString()} VC but only have ${formatPoints(userData?.vaultyPoints)}`,
        variant: "destructive",
      });
      return;
    }

    setIsRedeeming(true);
    setSelectedPackage(packageOption);

    try {
      // Deduct credits from user
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        vaultyPoints: (userData?.vaultyPoints || 0) - packageOption.vc
      });

      toast({
        title: "Redeemed!",
        description: `You redeemed a $${packageOption.usd} ${selectedProvider.name} Gift Card for ${packageOption.vc.toLocaleString()} VC`,
      });

      setDialogOpen(false);
      setSelectedProvider(null);
      setSelectedPackage(null);
    } catch (error) {
      console.error("Error redeeming gift card:", error);
      toast({
        title: "Error",
        description: "Failed to redeem gift card. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setLocation("/home/overview")}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Gift Card Shop</h1>
        </div>

        {/* User Balance */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <p className="text-yellow-500 text-xs font-bold uppercase tracking-wider mb-1">Your Balance</p>
            <h2 className="text-3xl font-bold text-white flex items-center gap-2">
              {formatPoints(userData?.vaultyPoints)} <VaultyIcon size={24} />
            </h2>
          </div>
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
            <VaultyIcon size={32} />
          </div>
        </div>
      </div>

      {/* Gift Cards Grid */}
      <div className="p-4">
        <div className="space-y-2 mb-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Redeem Gift Cards</h2>
          <p className="text-sm text-gray-500">Select a provider to redeem gift cards using your Vaulty Credits</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {PAYMENT_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleProviderClick(provider)}
              className="group bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-6 hover:border-cyan-500/50 hover:from-white/15 hover:to-white/10 transition-all duration-300 text-left relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-purple-500/0 group-hover:from-cyan-500/10 group-hover:to-purple-500/10 transition-all duration-500" />

              <div className="relative z-10 flex items-center gap-6">
                {/* Logo */}
                <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform p-2">
                  <img src={provider.image} alt={provider.name} className="w-full h-full object-contain" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-1">{provider.name}</h3>
                  <p className="text-sm text-gray-400">{provider.description}</p>
                </div>

                {/* Arrow */}
                <div className="text-cyan-400 group-hover:translate-x-1 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Redeem Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-950 border-white/20 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selectedProvider?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Select the gift card amount you want to redeem
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {PACKAGE_OPTIONS.map((option) => (
              <button
                key={option.usd}
                onClick={() => handleRedeem(option)}
                disabled={isRedeeming || (userData?.vaultyPoints || 0) < option.vc}
                className="w-full group bg-gradient-to-r from-white/10 to-white/5 border border-white/20 rounded-xl p-4 hover:border-cyan-500/50 hover:from-cyan-500/20 hover:to-cyan-500/10 transition-all flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-left">
                  <p className="text-lg font-bold text-white">${option.usd}</p>
                  <p className="text-xs text-gray-500">Gift Card</p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-cyan-400 flex items-center gap-1">
                    <VaultyIcon size={16} />
                    {option.vc.toLocaleString()} VC
                  </p>
                  <p className="text-xs text-gray-500">Cost</p>
                </div>

                {isRedeeming && selectedPackage?.usd === option.usd ? (
                  <div className="ml-4 text-cyan-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                  <div className="ml-4 text-cyan-400 group-hover:translate-x-1 transition-transform group-disabled:opacity-50">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-white/10 pt-4 mt-4">
            <p className="text-xs text-gray-500 text-center">
              Gift cards will be delivered to your account after redeeming
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
