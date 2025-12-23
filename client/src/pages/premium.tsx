import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { ChevronLeft, Check, Sparkles, Headset, Gift, Lock } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, collection, getDocs, query, where } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { addMonths } from "date-fns";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Import badge images
import badgePro from "/assets/badges/badge-pro.png";
import badgeUltra from "/assets/badges/badge-ultra.png";
import badgeMax from "/assets/badges/badge-max.png";

// Initialize Stripe with the LIVE key
const stripePromise = loadStripe("pk_live_51SbQJ9HChlVvIks4OVBZysQhGeehAbwISpcSDuxNYy64nTJu780uJcvR0afAzKUZhpnVkFVHPv7iUPlcIYjEIDLh00GF5Z3JoY");

const CheckoutForm = ({ tier, price, billingCycle, onSuccess, onCancel }: { 
  tier: string, 
  price: number, 
  billingCycle: string, 
  onSuccess: () => void, 
  onCancel: () => void 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/premium?success=true",
        },
        redirect: "if_required",
      });

      if (submitError) {
        setError(submitError.message || "Payment failed");
        setProcessing(false);
      } else {
        // Payment successful
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium capitalize">{tier} Plan</span>
            <span className="font-bold">${price}/{billingCycle === "monthly" ? "mo" : "yr"}</span>
          </div>
          <div className="text-sm text-gray-400">
            Total to pay today
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <PaymentElement 
              options={{
                layout: "tabs",
                paymentMethodOrder: ["apple_pay", "google_pay", "card"],
              }}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-md border border-red-400/20">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="flex-1 border-white/10 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!stripe || processing}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold"
            >
              {processing ? "Processing..." : `Pay $${price}`}
            </Button>
          </div>
        </form>
      </div>
      
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <Lock size={12} />
        <span>Secured by Stripe (Live Mode)</span>
      </div>
    </div>
  );
};

const PaymentWrapper = ({ tier, price, billingCycle, onSuccess, onCancel }: {
  tier: string,
  price: number,
  billingCycle: string,
  onSuccess: () => void,
  onCancel: () => void
}) => {
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Create PaymentIntent as soon as the component loads
    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: price, tier, billingCycle }),
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error:", error);
        setLoading(false);
      });
  }, [price, tier, billingCycle]);

  if (loading || !clientSecret) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm 
        tier={tier} 
        price={price} 
        billingCycle={billingCycle}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
};

export default function Premium() {
  const { user, userData } = useAuth();
  const [location, setLocation] = useLocation();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedTier, setSelectedTier] = useState<"pro" | "ultra" | "max">("pro");
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const tiers = {
    pro: {
      price: { monthly: 9.99, yearly: 99.99 },
      features: ["Basic AI Insights", "Budget Tracking", "5 Goals", "Email Support", "Exclusive Profile Badge"],
      gradient: "from-cyan-400 to-blue-500",
      image: badgePro,
      points: 1000
    },
    ultra: {
      price: { monthly: 19.99, yearly: 199.99 },
      features: ["Advanced AI Advisor", "Investment Tips", "Unlimited Goals", "Priority Support", "Exclusive Profile Badge"],
      gradient: "from-blue-400 to-pink-500",
      image: badgeUltra,
      points: 2000
    },
    max: {
      price: { monthly: 49.99, yearly: 499.99 },
      features: ["Personal Finance Coach", "Portfolio Analysis", "Tax Tools", "24/7 VIP Support", "Exclusive Profile Badge"],
      gradient: "from-pink-400 to-cyan-500",
      image: badgeMax,
      points: 3500
    }
  };

  const basePrice = tiers[selectedTier].price[billingCycle];
  
  // Check if discount applies to current tier
  let currentPrice = basePrice;
  let displayDiscount = appliedDiscount;
  
  if (appliedDiscount && appliedDiscount.plan) {
    if (appliedDiscount.plan !== "All" && appliedDiscount.plan.toLowerCase() !== selectedTier.toLowerCase()) {
      displayDiscount = null;
    }
  }
  
  if (displayDiscount && displayDiscount.discountedPrice) {
    currentPrice = displayDiscount.discountedPrice;
  }

  const currentPlan = userData?.premiumPlan || userData?.subscription || "free";
  const currentSubscription = currentPlan.toLowerCase() as any;

  useEffect(() => {
    // Check for applied discount in sessionStorage
    const stored = sessionStorage.getItem("appliedDiscount");
    if (stored) {
      try {
        setAppliedDiscount(JSON.parse(stored));
      } catch (e) {
        setAppliedDiscount(null);
      }
    }
  }, []);

  const handleSubscribeClick = () => {
    if (!user) return;
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    if (!user) return;
    try {
      const points = tiers[selectedTier].points;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      await updateDoc(doc(db, "users", user.uid), {
        premiumPlan: selectedTier.toUpperCase(),
        subscription: selectedTier,
        subscriptionDate: new Date(),
        premiumExpiry: expiryDate,
        vaultyPoints: increment(points)
      });
      setShowPaymentModal(false);
      sessionStorage.removeItem("appliedDiscount");
      setAppliedDiscount(null);
      alert(`Successfully upgraded to ${selectedTier.toUpperCase()}! You received ${points} Vaulty Points!`);
    } catch (error) {
      console.error("Error updating subscription", error);
      alert("Payment successful but failed to update profile. Please contact support.");
    }
  };

  const handleRedeem = async () => {
    if (!user) return;
    
    setRedeemLoading(true);
    
    try {
      // Check promo codes collection
      const promosQuery = query(
        collection(db, "promo_codes"), 
        where("code", "==", redeemCode.toUpperCase())
      );
      const promosSnapshot = await getDocs(promosQuery);
      
      if (promosSnapshot.empty) {
        alert("Invalid redeem code");
        setRedeemLoading(false);
        return;
      }

      const promoData = promosSnapshot.docs[0].data();
      
      // Check if expired
      if (promoData.expiresAt) {
        const expiryDate = new Date(promoData.expiresAt.seconds * 1000);
        if (expiryDate < new Date()) {
          alert("This promo code has expired");
          setRedeemLoading(false);
          return;
        }
      }

      // Check if plan matches
      const targetPlan = selectedTier.toLowerCase();
      if (promoData.plan !== "All" && promoData.plan.toLowerCase() !== targetPlan) {
        alert(`This code is only valid for ${promoData.plan} plan`);
        setRedeemLoading(false);
        return;
      }

      // Apply discount to current price
      const discountAmount = (basePrice * promoData.discount) / 100;
      const discountedPrice = basePrice - discountAmount;

      // Store and update state
      const discountObj = {
        code: promoData.code,
        discount: promoData.discount,
        originalPrice: basePrice,
        discountedPrice: Math.round(discountedPrice * 100) / 100,
        plan: promoData.plan
      };
      
      sessionStorage.setItem("appliedDiscount", JSON.stringify(discountObj));
      setAppliedDiscount(discountObj);

      alert(`Promo code applied! ${promoData.discount}% discount ($${discountAmount.toFixed(2)} off) - New price: $${discountedPrice.toFixed(2)}`);
      setRedeemCode("");
      setRedeemLoading(false);
    } catch (error) {
      console.error("Error redeeming code", error);
      alert("Error redeeming code");
      setRedeemLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/")} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-lg font-bold">Upgrade Plan</h1>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full">
            <Headset size={20} className="text-gray-400" />
          </button>
        </div>
      </div>

      <div className="p-6 max-w-lg mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Unlock Full Power
          </h1>
          <p className="text-gray-400">Choose the plan that fits your financial journey</p>
          {currentPlan !== "free" && (
            <div className="text-sm font-semibold text-cyan-400 pt-2">
              Current Plan: <span className="uppercase">{currentPlan}</span>
            </div>
          )}
        </div>

        {/* Redeem Code Section */}
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
            <Gift size={16} className="text-pink-400" />
            <span>Have a redeem code?</span>
          </div>
          <div className="flex gap-2">
            <Input 
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
              placeholder="Enter code..." 
              className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
            />
            <button 
              onClick={handleRedeem}
              disabled={redeemLoading || !redeemCode}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors text-sm"
            >
              {redeemLoading ? "..." : "Redeem"}
            </button>
          </div>
          {displayDiscount && (
            <div className="text-xs text-green-400 bg-green-400/10 p-2 rounded border border-green-400/30">
              ✓ Promo code "{displayDiscount.code}" applied! {displayDiscount.discount}% off
            </div>
          )}
        </div>

        {/* Billing Toggle */}
        <div className="bg-white/5 p-1 rounded-xl flex border border-white/10">
          {(["monthly", "yearly"] as const).map((cycle) => (
            <button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                billingCycle === cycle 
                  ? "bg-white/10 text-white shadow-lg" 
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
              {cycle === "yearly" && <span className="ml-1 text-xs text-cyan-400">(-20%)</span>}
            </button>
          ))}
        </div>

        {/* Tier Card */}
        <div className="relative rounded-3xl overflow-hidden border border-white/10 group">
          <div className={`absolute inset-0 bg-gradient-to-br ${tiers[selectedTier].gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
          
          <div className="relative p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold capitalize flex items-center gap-2">
                  {selectedTier}
                  {selectedTier === "max" && <Sparkles size={20} className="text-pink-400" />}
                </h2>
                <p className="text-gray-400 text-sm mt-1">Perfect for serious investors</p>
              </div>
              <div className="relative w-20 h-20">
                 <img 
                   src={tiers[selectedTier].image} 
                   alt={`${selectedTier} badge`}
                   className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                 />
              </div>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold">${currentPrice}</span>
              {displayDiscount && (
                <span className="text-sm text-green-400 line-through ml-2">${basePrice}</span>
              )}
              <span className="text-gray-400">/{billingCycle === "monthly" ? "mo" : "yr"}</span>
            </div>

            {/* Feature List */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center gap-3">
                 <div className={`p-1 rounded-full bg-gradient-to-br ${tiers[selectedTier].gradient}`}>
                    <Check size={12} className="text-black stroke-[3]" />
                 </div>
                 <span className="text-gray-300 font-medium">+{tiers[selectedTier].points} Vaulty Points</span>
              </div>
              {tiers[selectedTier].features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className={`p-1 rounded-full bg-gradient-to-br ${tiers[selectedTier].gradient}`}>
                    <Check size={12} className="text-black stroke-[3]" />
                  </div>
                  <span className="text-gray-300">{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubscribeClick}
              disabled={currentSubscription === selectedTier.toLowerCase()}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${
                currentSubscription === selectedTier.toLowerCase()
                  ? "bg-white/10 text-gray-400 cursor-not-allowed" 
                  : `bg-gradient-to-r ${tiers[selectedTier].gradient}`
              }`}
            >
              {currentSubscription === selectedTier.toLowerCase() ? "✓ Current Plan" : "Upgrade Now"}
            </button>
          </div>
        </div>

        {/* Tier Selector */}
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(tiers) as Array<keyof typeof tiers>).map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`p-4 rounded-2xl border transition-all ${
                selectedTier === tier
                  ? `bg-white/10 border-white/30 ring-2 ring-${tier === "max" ? "pink" : "blue"}-500/50`
                  : "bg-white/5 border-white/10 opacity-60 hover:opacity-100"
              }`}
            >
              <div className="font-bold capitalize mb-1">{tier}</div>
              <div className="text-xs text-gray-400">${tiers[tier].price[billingCycle]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Secure Checkout</DialogTitle>
            <DialogDescription className="text-gray-400">
              Complete your upgrade to Vaulty {selectedTier.toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          
          <PaymentWrapper
            tier={selectedTier} 
            price={currentPrice} 
            billingCycle={billingCycle}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setShowPaymentModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
