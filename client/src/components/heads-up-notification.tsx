import React, { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  getFirestore 
} from "firebase/firestore";
import { initializeApp, getApps, getApp } from "firebase/app";
import { X, Bell } from "lucide-react";

// --- Firebase Initialization Fallback ---
// Ker v okolju Canvas alias "@/lib/firebase" morda ni dosegljiv, 
// uporabimo varno inicializacijo, ki uporablja vaše obstoječe nastavitve.
let db: any;
try {
  // Poskusimo dobiti obstoječo instanco ali inicializirati z okoljskimi spremenljivkami
  const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase initialization error:", e);
}

interface HeadsUpNotif {
  id: string;
  message: string;
  timestamp: any;
}

export function HeadsUpNotification() {
  const [notification, setNotification] = useState<HeadsUpNotif | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!db) return;

    // Logika ostaja identična tvoji originalni
    const q = query(
      collection(db, "global_notifications"),
      orderBy("timestamp", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const doc = change.doc;
          const data = doc.data();
          
          if (data.fromSuperAdmin || data.isAdmin) {
            setNotification({
              id: doc.id,
              message: data.message,
              timestamp: data.timestamp
            });
            setIsVisible(true);

            const timer = setTimeout(() => {
              setIsVisible(false);
            }, 5000);

            return () => clearTimeout(timer);
          }
        }
      });
    }, (error) => {
      console.error("Firestore error:", error);
    });

    return () => unsubscribe();
  }, []);

  if (!isVisible || !notification) return null;

  return (
    <div className="fixed top-6 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
      <div className="relative group pointer-events-auto">
        {/* Zunanji sij za globino */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 to-purple-600/30 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition duration-1000"></div>
        
        {/* Glavna steklena kapsula */}
        <div className="relative flex items-center gap-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full px-6 py-3 min-w-[300px] max-w-sm shadow-[0_15px_35px_rgba(0,0,0,0.4)] animate-in slide-in-from-top-4 duration-500">
          
          {/* Ikona z nežnim pulziranjem */}
          <div className="shrink-0 relative">
            <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
              <Bell className="h-5 w-5 text-white animate-pulse" />
            </div>
            {/* Indikator statusa */}
            <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-blue-400 rounded-full border-2 border-[#121212] shadow-sm"></div>
          </div>
          
          {/* Besedilo z boljšo tipografijo */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.15em] text-blue-300 uppercase opacity-90 mb-0.5">Vaulty</p>
            <p className="text-white text-sm font-medium leading-tight line-clamp-2 drop-shadow-md">
              {notification.message}
            </p>
          </div>

          {/* Gumb za zapiranje z rotacijo ob hoverju */}
          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 hover:bg-white/10 rounded-full transition-all group/close"
          >
            <X className="h-4 w-4 text-white/40 group-hover/close:text-white group-hover/close:rotate-90 transition-all duration-300" />
          </button>

          {/* Elegantna spodnja animirana linija napredka */}
          <div className="absolute bottom-1.5 left-12 right-12 h-[1px] bg-white/5 rounded-full overflow-hidden">
            <div className="h-full w-full animate-progress-glow"></div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progress-glow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-glow {
          animation: progress-glow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.6), transparent);
        }
        @keyframes slide-in-from-top-4 {
          from { transform: translateY(-1.5rem); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in {
          animation: slide-in-from-top-4 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}