import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  onSnapshot
} from "firebase/firestore";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from "firebase/auth";
import { X, Bell } from "lucide-react";

// --- Firebase Configuration & Initialization ---
// Uporabljamo globalne spremenljivke okolja
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

/**
 * HeadsUpNotification Komponenta
 * Izvažamo kot poimenovano funkcijo, da ustreza uvozu v App.tsx
 */
export function HeadsUpNotification() {
  const [notification, setNotification] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [progress, setProgress] = useState(100);

  // 1. Avtentikacija (RULE 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        // Tihi fail za background proces
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Poslušalec za obvestila v realnem času
  useEffect(() => {
    if (!user) return;

    // RULE 1: Stroga pot do kolekcije
    const notificationsRef = collection(db, 'artifacts', appId, 'public', 'data', 'global_notifications');
    
    // RULE 2: Pridobimo vse in razvrstimo v spominu (brez kompleksnih queryjev)
    const unsubscribe = onSnapshot(
      notificationsRef,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Razvrščanje po času v JS
        const sortedDocs = docs.sort((a: any, b: any) => {
          const timeA = a.timestamp?.seconds || 0;
          const timeB = b.timestamp?.seconds || 0;
          return timeB - timeA;
        });

        const latest = sortedDocs[0];

        // Prikaži obvestilo, če je od admina
        if (latest && (latest.fromSuperAdmin || latest.isAdmin)) {
          setNotification(latest);
          setIsVisible(true);
          setProgress(100);

          const duration = 6000;
          const intervalTime = 100;
          const step = (intervalTime / duration) * 100;

          const timer = setTimeout(() => {
            setIsVisible(false);
          }, duration);

          const progressInterval = setInterval(() => {
            setProgress(prev => Math.max(0, prev - step));
          }, intervalTime);

          return () => {
            clearTimeout(timer);
            clearInterval(progressInterval);
          };
        }
      },
      (error) => {
        console.error("Firestore error:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (!isVisible || !notification) return null;

  return (
    <div className="fixed top-6 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
      <div className="relative group pointer-events-auto">
        {/* Odsevni sij (Glow) v ozadju */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-indigo-600/20 rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition duration-1000"></div>
        
        {/* Glavna Glass kapsula */}
        <div className="relative flex items-center gap-4 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-full px-6 py-3 min-w-[300px] max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-top-4 duration-500">
          
          {/* Ikona s pulzirajočim efektom */}
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-white/10 to-white/5 flex items-center justify-center border border-white/10 shadow-inner">
              <Bell className="h-5 w-5 text-blue-400 animate-pulse" />
            </div>
            <div className="absolute top-0 right-0 h-2.5 w-2.5 bg-blue-500 rounded-full border-2 border-[#121212]"></div>
          </div>

          {/* Vsebina obvestila */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-tighter uppercase text-blue-400/80">
                Sistemsko sporočilo
              </span>
            </div>
            <p className="text-white/90 text-sm font-medium leading-tight line-clamp-2">
              {notification.message}
            </p>
          </div>

          {/* Gumb za zaprtje */}
          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors group/btn"
          >
            <X className="h-4 w-4 text-white/30 group-hover/btn:text-white transition-transform group-hover/btn:rotate-90" />
          </button>

          {/* Elegantna spodnja črta (Progress) */}
          <div className="absolute bottom-1.5 left-10 right-10 h-[1px] bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500/60 shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-in-from-top-4 {
          from { transform: translateY(-1rem); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in {
          animation: slide-in-from-top-4 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}} />
    </div>
  );
}