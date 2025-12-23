import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc, setDoc } from "firebase/firestore";
import { X, Check, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MessageRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  message: string;
  timestamp: any;
  senderData?: any;
}

export default function MessageRequests() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "messageRequests"),
      where("recipientId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const requestsData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data() as any;
            const senderDoc = await getDoc(doc(db, "users", data.senderId));
            return {
              id: docSnap.id,
              ...data,
              senderData: senderDoc.exists() ? senderDoc.data() : null
            } as MessageRequest;
          })
        );
        setRequests(requestsData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching requests:", err);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleAccept = async (request: MessageRequest) => {
    if (!user) return;
    try {
      // Create chat
      const ids = [user.uid, request.senderId].sort();
      const chatId = `${ids[0]}_${ids[1]}`;
      const chatRef = doc(db, "chats", chatId);
      
      await setDoc(chatRef, {
        participants: [user.uid, request.senderId],
        acceptedConnections: [user.uid, request.senderId],
        createdAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });

      // Delete request
      await deleteDoc(doc(db, "messageRequests", request.id));
    } catch (err) {
      console.error("Error accepting request:", err);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, "messageRequests", requestId));
    } catch (err) {
      console.error("Error rejecting request:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6 bg-black/80 backdrop-blur-md sticky top-0 z-10 border-b border-white/10">
        <h1 className="text-xl font-bold">Message Requests</h1>
        <button onClick={() => setLocation("/messages")} className="text-white">
          <X size={24} />
        </button>
      </div>

      {/* Requests List */}
      <div className="px-4 py-4 pb-20">
        {requests.length === 0 ? (
          <div className="text-center text-zinc-500 py-10">
            <p>No message requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div 
                key={request.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={request.senderData?.photoURL} />
                    <AvatarFallback>{request.senderData?.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-bold text-white">{request.senderData?.displayName || request.senderName}</h3>
                    <p className="text-xs text-zinc-400">@{request.senderData?.username || "user"}</p>
                  </div>
                </div>

                <p className="text-sm text-zinc-300 bg-white/5 p-3 rounded-lg">{request.message}</p>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(request)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Check size={16} /> Accept
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
