import React, { createContext, useContext, useState } from "react";

interface NotificationContextType {
  unreadCount: number;
  notifications: any[];
  markAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  notifications: [],
  markAsRead: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(3);
  const [notifications] = useState([
    { id: 1, title: "Welcome to Vaulty", read: false },
    { id: 2, title: "Daily Goal Achieved", read: false },
    { id: 3, title: "New Feature Available", read: false },
  ]);

  const markAsRead = () => setUnreadCount(0);

  return (
    <NotificationContext.Provider value={{ unreadCount, notifications, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
