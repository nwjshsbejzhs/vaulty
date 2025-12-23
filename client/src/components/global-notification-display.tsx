import { useGlobalNotification } from '@/contexts/global-notification-context';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function GlobalNotificationDisplay() {
  const { notifications, removeNotification } = useGlobalNotification();

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
      <AnimatePresence mode="wait">
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -120 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -120 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="pointer-events-auto w-full"
          >
            <div className="p-4">
              <div className="max-w-md mx-auto px-2">
                <div className="bg-black rounded-full py-4 px-7 flex items-center justify-between shadow-xl border border-white/10">
                  <div className="flex-1">
                    <p className="text-white font-bold text-base leading-tight">
                      {notification.message}
                    </p>
                    {notification.description && (
                      <p className="text-white/60 text-sm mt-0.5 leading-snug">
                        {notification.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="ml-4 p-1.5 hover:bg-white/20 rounded-full transition-colors flex-shrink-0 flex items-center justify-center"
                  >
                    <X size={24} className="text-white" strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
