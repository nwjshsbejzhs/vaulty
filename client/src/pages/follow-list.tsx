import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation, Link, useRoute } from "wouter";
import { ChevronLeft, Search as SearchIcon, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface UserListItem {
  id: string;
  displayName: string;
  photoURL: string;
  email: string;
}

export default function FollowList() {
  const [match, params] = useRoute("/users/:id/:type"); // type: 'followers' | 'following'
  const userId = params?.id;
  const listType = params?.type as 'followers' | 'following';
  
  const { user: currentUser } = useAuth();
  const [location, setLocation] = useLocation();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [profileUser, setProfileUser] = useState<any>(null);
  const [isPrivateList, setIsPrivateList] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchList = async () => {
      if (!userId || !listType) return;

      try {
        const userDocRef = doc(db, "users", userId);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setProfileUser(userData);

          // Check privacy settings for following list
          if (listType === 'following' && userData.privateFollowingList && currentUser?.uid !== userId) {
            setIsPrivateList(true);
            setLoading(false);
            return;
          }

          const ids = listType === 'followers' ? userData.followers || [] : userData.following || [];
          
          if (ids.length > 0) {
            // Fetch user details for each ID
            // In a real app with many users, this should be paginated or done via backend query
            const userPromises = ids.map((id: string) => getDoc(doc(db, "users", id)));
            const userSnaps = await Promise.all(userPromises);
            
            const fetchedUsers = userSnaps
              .filter(snap => snap.exists())
              .map(snap => ({
                id: snap.id,
                ...snap.data()
              } as UserListItem));
              
            setUsers(fetchedUsers);
            setFilteredUsers(fetchedUsers);
          }
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [userId, listType, currentUser]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredUsers(users.filter(u => 
        u.displayName?.toLowerCase().includes(lower) || 
        u.email?.toLowerCase().includes(lower)
      ));
    }
  }, [searchTerm, users]);

  const handleUserClick = (targetUserId: string) => {
    if (currentUser?.uid === targetUserId) {
      toast({ title: "This is you!", description: "You cannot view your own public profile." });
    } else {
      setLocation(`/user/${targetUserId}`);
    }
  };

  if (!userId || !listType) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="flex items-center gap-3 mb-4">
           <button onClick={() => window.history.back()} className="p-2 hover:bg-white/10 rounded-full">
             <ChevronLeft size={24} />
           </button>
           <h1 className="font-bold text-lg capitalize">
             {profileUser?.displayName ? `${profileUser.displayName}'s ` : ''}
             {listType}
           </h1>
        </div>

        {!isPrivateList && (
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${listType}...`}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500"
            />
          </div>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : isPrivateList ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="text-gray-400" size={32} />
            </div>
            <h3 className="font-bold text-lg mb-2">Private List</h3>
            <p className="text-gray-500">This user's following list is private.</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div 
                key={user.id} 
                onClick={() => handleUserClick(user.id)}
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
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}
