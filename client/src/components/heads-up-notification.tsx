import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X, Bell } from "lucide-react";

interface HeadsUpNotif {
  id: string;
  message: string;
  timestamp: any;
}

export function HeadsUpNotification() {
  const [notification, setNotification] = useState<HeadsUpNotif | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen to global notifications
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
          
          // Only show if notification is from superadmin
          if (data.fromSuperAdmin || data.isAdmin) {
            setNotification({
              id: doc.id,
              message: data.message,
              timestamp: data.timestamp
            });
            setIsVisible(true);

            // Auto-hide after 5 seconds
            const timer = setTimeout(() => {
              setIsVisible(false);
            }, 5000);

            return () => clearTimeout(timer);
          }
        }
      });
    });

    return () => unsubscribe();
  }, []);

  if (!isVisible || !notification) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] flex justify-center pointer-events-none pt-2 px-4">
      <div
        className="flex items-center gap-3 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 max-w-sm w-full shadow-2xl animate-in slide-in-from-top-2 duration-500 pointer-events-auto"
      >
        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm truncate">Vaulty</p>
          <p className="text-gray-300 text-xs leading-tight line-clamp-2">{notification.message}</p>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0"
        >
          <X className="h-4 w-4 text-gray-400 hover:text-white" />
        </button>
      </div>
    </div>
  );
}
