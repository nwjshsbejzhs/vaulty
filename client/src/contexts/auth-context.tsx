import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  type User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, onSnapshot, type DocumentSnapshot, updateDoc, getDoc, getDocs, collection } from "firebase/firestore";
import { isAdmin, isSuperAdmin } from "@/lib/admins";

interface AuthContextType {
  user: User | null;
  userData: any;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserBadges: (userId: string, badges: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  signInWithGoogle: async () => {},
  login: async () => {},
  register: async () => {},
  signOut: async () => {},
  updateUserBadges: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      setUser(user);
      if (!user) {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch user data from Firestore
  useEffect(() => {
    if (user) {
      setLoading(true);
      const unsub = onSnapshot(doc(db, "users", user.uid), async (docSnap: DocumentSnapshot) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isBanned) {
              firebaseSignOut(auth); // Force logout
              alert("Your account has been banned. If you believe this is an error, please contact Vaulty Group Support.");
              return;
            }
            
            // AUTOMATIC BADGE ASSIGNMENT LOGIC
            let badges = data.badges || [];
            let needsUpdate = false;

            // 1. Admin Badge
            const userIsAdmin = isAdmin(user.email) || isSuperAdmin(user.email) || data.isAdmin;
            if (userIsAdmin && !badges.includes("admin")) {
                badges.push("admin");
                needsUpdate = true;
            }

            // 2. Early Supporter Badge (First 100 users)
            if (!badges.includes("early-supporter")) {
                try {
                    const usersSnap = await getDocs(collection(db, "users"));
                    if (usersSnap.size <= 100) {
                        badges.push("early-supporter");
                        needsUpdate = true;
                    }
                } catch (e) {
                    console.error("Error checking user count for badge", e);
                }
            }

            // 3. Premium Badges Logic (Automatic sync if needed)
            // This ensures badges persist if subscription is active
            // Check both new premiumPlan and old subscription fields
            const userPlan = data.premiumPlan || data.subscription;
            
            if (userPlan === "PRO" && !badges.includes("premium-pro")) {
                 badges.push("premium-pro");
                 badges = badges.filter((b: string) => b !== "premium-ultra" && b !== "premium-max");
                 needsUpdate = true;
            } else if (userPlan === "ULTRA" && !badges.includes("premium-ultra")) {
                 badges.push("premium-ultra");
                 badges = badges.filter((b: string) => b !== "premium-pro" && b !== "premium-max");
                 needsUpdate = true;
            } else if (userPlan === "MAX" && !badges.includes("premium-max")) {
                 badges.push("premium-max");
                 badges = badges.filter((b: string) => b !== "premium-pro" && b !== "premium-ultra");
                 needsUpdate = true;
            } else if (userPlan === "pro" && !badges.includes("premium-pro")) {
                 badges.push("premium-pro");
                 badges = badges.filter((b: string) => b !== "premium-ultra" && b !== "premium-max");
                 needsUpdate = true;
            } else if (userPlan === "ultra" && !badges.includes("premium-ultra")) {
                 badges.push("premium-ultra");
                 badges = badges.filter((b: string) => b !== "premium-pro" && b !== "premium-max");
                 needsUpdate = true;
            } else if (userPlan === "max" && !badges.includes("premium-max")) {
                 badges.push("premium-max");
                 badges = badges.filter((b: string) => b !== "premium-pro" && b !== "premium-ultra");
                 needsUpdate = true;
            } else if (!userPlan || userPlan === "none") {
                 // Remove all premium badges
                 badges = badges.filter((b: string) => !b.includes("premium"));
                 if (data.badges && data.badges.some((b: string) => b.includes("premium"))) {
                    needsUpdate = true;
                 }
            }

            if (needsUpdate) {
                await updateDoc(doc(db, "users", user.uid), { badges });
            } else {
                setUserData(data);
            }
          }
          setLoading(false);
        });
      return () => unsub();
    }
  }, [user]);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, "users", result.user.uid);
      await setDoc(userRef, {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      }, { merge: true });

    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const login = async (email: string, pass: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      
      // Update password in Firestore on login to ensure we have the latest credential
      await setDoc(doc(db, "users", result.user.uid), {
        password: pass
      }, { merge: true });

    } catch (error) {
      console.error("Error logging in", error);
      throw error;
    }
  };

  const register = async (email: string, pass: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      
      await updateProfile(result.user, {
        displayName: name,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
      });

      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        email: email,
        password: pass, // Storing password as requested
        displayName: name,
        photoURL: result.user.photoURL,
        vaultyPoints: 100, // Welcome bonus VP
        xp: 0, // Initialize XP
        subscription: "free",
        createdAt: serverTimestamp(),
        badges: [] // Initialize badges array
      });

    } catch (error) {
      console.error("Error registering", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const updateUserBadges = async (userId: string, badges: string[]) => {
      try {
          await updateDoc(doc(db, "users", userId), { badges });
      } catch (error) {
          console.error("Error updating badges:", error);
          throw error;
      }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signInWithGoogle, login, register, signOut, updateUserBadges }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
