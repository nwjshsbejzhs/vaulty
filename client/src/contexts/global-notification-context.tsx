import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export interface GlobalNotification {
  id: string;
  message: string;
  description?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface GlobalNotificationContextType {
  notifications: GlobalNotification[];
  addNotification: (message: string, description?: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  removeNotification: (id: string) => void;
}

const GlobalNotificationContext = createContext<GlobalNotificationContextType | undefined>(undefined);

export function GlobalNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);

  // Listen to Firestore global notifications
  useEffect(() => {
    try {
      const q = query(
        collection(db, "global_notifications"),
        orderBy("timestamp", "desc"),
        limit(1)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            addNotification(data.message, data.description, 'info', 5000);
          }
        });
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error listening to global notifications:", error);
    }
  }, []);

  const addNotification = useCallback((message: string, description?: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 4000) => {
    const id = Date.now().toString();
    const notification: GlobalNotification = { id, message, description, type, duration };
    
    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <GlobalNotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </GlobalNotificationContext.Provider>
  );
}

export function useGlobalNotification() {
  const context = useContext(GlobalNotificationContext);
  if (!context) {
    throw new Error('useGlobalNotification must be used within GlobalNotificationProvider');
  }
  return context;
}
