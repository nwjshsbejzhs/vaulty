import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  query
} from "firebase/firestore";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from "firebase/auth";
import { X, Bell } from "lucide-react";

// --- Firebase Configuration & Initialization ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [notification, setNotification] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(100);

  // 1. Authentication Lifecycle (RULE 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        // Silent fail for background auth
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Real-time Notifications Listener
  useEffect(() => {
    if (!user) return;

    // RULE 1: Strict collection path
    const notificationsRef = collection(db, 'artifacts', appId, 'public', 'data', 'global_notifications');
    
    // RULE 2: Fetch all and sort/filter in memory to avoid index requirements
    const unsubscribe = onSnapshot(
      notificationsRef,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort by timestamp in memory (Rule 2)
        const sortedDocs = docs.sort((a, b) => {
          const timeA = a.timestamp?.seconds || 0;
          const timeB = b.timestamp?.seconds || 0;
          return timeB - timeA;
        });

        const latest = sortedDocs[0];

        // Trigger notification visibility
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
        // Handle potential permission or connection errors
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (!isVisible || !notification) return null;

  return (
    <div className="fixed top-6 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
      <div className="relative group pointer-events-auto">
        {/* Glow Background Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/30 to-purple-600/30 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition duration-1000"></div>
        
        {/* The Glass Pill */}
        <div className="relative flex items-center gap-4 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-full px-6 py-3 min-w-[320px] max-w-md shadow-[0_10px_40px_rgba(0,0,0,0.4)] animate-in slide-in-from-top-4 fade-in duration-500">
          
          {/* Icon with Ring */}
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center border border-white/10">
              <Bell className="h-5 w-5 text-white animate-bounce-subtle" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-cyan-400 rounded-full border-2 border-black/20 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-black tracking-[0.2em] uppercase text-cyan-400/90">
                Vaulty Global
              </span>
            </div>
            <p className="text-white text-sm font-medium leading-tight line-clamp-2 drop-shadow-sm">
              {notification.message}
            </p>
          </div>

          {/* Exit Button */}
          <button
            onClick={() => setIsVisible(false)}
            className="group/close p-1.5 hover:bg-white/10 rounded-full transition-all duration-300"
          >
            <X className="h-4 w-4 text-white/40 group-hover/close:text-white group-hover/close:rotate-90 transition-all" />
          </button>

          {/* Dynamic Progress Indicator */}
          <div className="absolute bottom-1.5 left-8 right-8 h-[1px] bg-white/5 overflow-hidden rounded-full">
            <div 
              className="h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(34,211,238,0.8)]"
              style={{ width: `${progress}%`, margin: '0 auto' }}
            />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
        @keyframes slide-in-from-top-4 {
          from { transform: translateY(-1.5rem); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in {
          animation: slide-in-from-top-4 0.7s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }
      `}} />
    </div>
  );
}