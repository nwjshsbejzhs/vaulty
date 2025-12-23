import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Search as SearchIcon, ChevronLeft, User } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import { isSuperAdmin } from "@/lib/admins";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleSearch = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // Simple search implementation
        // Note: Firebase simple queries are case-sensitive and prefix-based
        const usersRef = collection(db, "users");
        // We'll just fetch all users for this prototype since we can't do complex text search easily in client-side firestore without extra setup
        // In a real app, use Algolia or a dedicated search service
        const q = query(usersRef, limit(20)); 
        
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Client-side filtering for better experience in prototype
        const filtered = users.filter((u: any) => 
          !u.isBanned && // Filter out banned users
          (!u.isGhost || (currentUser && (currentUser.uid === u.id || isSuperAdmin(currentUser.email)))) && // Filter out ghost users unless self or Super Admin
          (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        setResults(filtered);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4">
        <h1 className="font-bold text-xl mb-4">Search</h1>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users..."
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500"
          />
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Searching...</div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            {results.map((user) => (
              <div 
                key={user.id} 
                onClick={() => {
                  if (currentUser?.uid === user.id) {
                    toast({ title: "This is you!", description: "You cannot view your own public profile." });
                  } else {
                    setLocation(`/user/${user.id}`);
                  }
                }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5"
              >
                <img 
                  src={user.photoURL || "https://github.com/shadcn.png"} 
                  alt={user.displayName}
                  className="w-12 h-12 rounded-full object-cover bg-gray-800"
                />
                <div>
                  <h3 className="font-bold text-white">{user.displayName}</h3>
                  <p className="text-sm text-gray-500">@{user.email?.split('@')[0]}</p>
                </div>
              </div>
            ))}
          </div>
        ) : searchTerm ? (
          <div className="text-center text-gray-500 py-8">
            <p>No users found matching "{searchTerm}"</p>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>Type to search for people</p>
          </div>
        )}
      </div>
    </div>
  );
}
