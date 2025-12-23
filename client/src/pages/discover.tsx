import { useState, useMemo, useEffect } from "react";
import { useCurrency } from "@/contexts/currency-context";
import { useQuery } from "@tanstack/react-query";
import { Search, TrendingUp, ChevronRight, ArrowUpRight, ArrowDownRight, Users } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Discover() {
  const { currency, format } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortFilter, setSortFilter] = useState("market_cap_desc");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Search users in Firebase
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchUsers = async () => {
      setLoadingUsers(true);
      try {
        const q = query(collection(db, "users"), where("displayName", ">=", debouncedSearch.toLowerCase()), where("displayName", "<=", debouncedSearch.toLowerCase() + "~"));
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSearchResults(users);
      } catch (error) {
        console.error("Error searching users:", error);
        setSearchResults([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    searchUsers();
  }, [debouncedSearch]);

  // Fetch coins using React Query with search functionality
  const { data: coins, isLoading: loadingCoins } = useQuery({
    queryKey: ["coins", debouncedSearch, currency],
    queryFn: async () => {
      // If searching, use the search endpoint
      if (debouncedSearch && debouncedSearch.length > 2) {
        const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${debouncedSearch}`);
        const data = await res.json();
        
        const coinIds = data.coins.slice(0, 20).map((c: any) => c.id).join(",");
        if (!coinIds) return [];
        
        const marketRes = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency.toLowerCase()}&ids=${coinIds}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`);
        if (!marketRes.ok) return []; // Fallback or empty
        return marketRes.json();
      }
      
      // Default: fetch top market cap coins
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency.toLowerCase()}&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h`);
      if (!res.ok) throw new Error("Failed to fetch coins");
      return res.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const sortedCoins = useMemo(() => {
    if (!coins) return [];
    let sorted = [...coins];
    if (sortFilter === "price_asc") sorted.sort((a: any, b: any) => a.current_price - b.current_price);
    if (sortFilter === "price_desc") sorted.sort((a: any, b: any) => b.current_price - a.current_price);
    if (sortFilter === "market_cap_asc") sorted.sort((a: any, b: any) => a.market_cap - b.market_cap);
    if (sortFilter === "market_cap_desc") sorted.sort((a: any, b: any) => b.market_cap - a.market_cap);
    return sorted;
  }, [coins, sortFilter]);

  // Check if search is active
  const isSearching = debouncedSearch && debouncedSearch.length > 2;

  return (
    <div className="min-h-screen pb-24 bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 p-4">
        <h1 className="text-2xl font-bold mb-4">Discover</h1>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coins, users..." 
            className="pl-10 bg-white/5 border-white/10 rounded-xl focus:bg-white/10"
          />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {isSearching ? (
          <>
            {/* Users Results */}
            {searchResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-pink-400" />
                  <h2 className="text-lg font-bold">Users</h2>
                </div>
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <Link key={user.id} href={`/user/${user.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer active:scale-98 duration-100">
                        <div className="flex items-center gap-3">
                          <img src={user.photoURL || "https://github.com/shadcn.png"} alt={user.displayName} className="w-8 h-8 rounded-full object-cover" />
                          <div>
                            <div className="font-bold text-sm">{user.displayName || "Unknown User"}</div>
                            <div className="text-xs text-gray-400">@{user.username || user.id.slice(0, 8)}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Coins Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  Coins
                </h2>
              </div>

              <div className="space-y-2">
                {loadingCoins ? (
                  <div className="text-center py-8 text-gray-500">Loading market data...</div>
                ) : sortedCoins.length > 0 ? (
                  sortedCoins.map((coin: any) => (
                    <Link key={coin.id} href={`/coin/${coin.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer active:scale-98 duration-100">
                        <div className="flex items-center gap-3">
                          <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                          <div>
                            <div className="font-bold text-sm">{coin.symbol.toUpperCase()}</div>
                            <div className="text-xs text-gray-400">{coin.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">{format(coin.current_price)}</div>
                          <div className={cn("text-xs flex items-center justify-end gap-1", coin.price_change_percentage_24h >= 0 ? "text-green-400" : "text-red-400")}>
                            {coin.price_change_percentage_24h >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">No coins found</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Trending Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  Top Coins
                </h2>
                <select 
                  value={sortFilter}
                  onChange={(e) => setSortFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg text-xs p-1 outline-none"
                >
                  <option value="market_cap_desc">Market Cap</option>
                  <option value="price_desc">Price (High-Low)</option>
                  <option value="price_asc">Price (Low-High)</option>
                </select>
              </div>

              <div className="space-y-2">
                {loadingCoins ? (
                  <div className="text-center py-8 text-gray-500">Loading market data...</div>
                ) : (
                  sortedCoins.map((coin: any) => (
                    <Link key={coin.id} href={`/coin/${coin.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer active:scale-98 duration-100">
                        <div className="flex items-center gap-3">
                          <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                          <div>
                            <div className="font-bold text-sm">{coin.symbol.toUpperCase()}</div>
                            <div className="text-xs text-gray-400">{coin.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">{format(coin.current_price)}</div>
                          <div className={cn("text-xs flex items-center justify-end gap-1", coin.price_change_percentage_24h >= 0 ? "text-green-400" : "text-red-400")}>
                            {coin.price_change_percentage_24h >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
            
            {/* News Placeholder */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold">Latest News</h2>
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/20 to-black border border-white/10">
                    <p className="text-gray-400 text-sm">Crypto news feed coming soon...</p>
                </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
