import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type SubscriptionTier = "free" | "pro" | "ultra" | "max";

interface PremiumContextType {
  subscription: SubscriptionTier;
  loading: boolean;
  hasAccess: (requiredTier: SubscriptionTier) => boolean;
  isPremium: boolean;
  tier: SubscriptionTier;
}

const PremiumContext = createContext<PremiumContextType>({
  subscription: "free",
  loading: true,
  hasAccess: () => false,
  isPremium: false,
  tier: "free",
});

export const usePremium = () => useContext(PremiumContext);

const tierHierarchy: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  ultra: 2,
  max: 3,
};

export const PremiumProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionTier>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setSubscription("free");
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        // Check new premiumPlan field first, fall back to old subscription field
        let plan = userData?.premiumPlan || userData?.subscription || "free";
        // Normalize to lowercase
        if (typeof plan === "string") {
          plan = plan.toLowerCase();
        }
        setSubscription((plan as SubscriptionTier) || "free");
      } catch (error) {
        console.error("Error fetching subscription:", error);
        setSubscription("free");
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const hasAccess = (requiredTier: SubscriptionTier) => {
    return tierHierarchy[subscription] >= tierHierarchy[requiredTier];
  };

  return (
    <PremiumContext.Provider 
      value={{ 
        subscription, 
        loading, 
        hasAccess, 
        isPremium: subscription !== "free",
        tier: subscription 
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
};
