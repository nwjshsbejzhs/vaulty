import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Globe, Activity, Layers, Calendar, DollarSign, BarChart3, Maximize2, X } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/currency-context";

// Utility for formatting large numbers
const formatCompactNumber = (number: number) => {
  if (!number) return "N/A";
  const formatter = Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
  return formatter.format(number);
};

const TIMEFRAMES = [
  { label: "1H", value: "1h", days: "1" }, // Proxy with 1 day data
  { label: "24H", value: "24h", days: "1" },
  { label: "7D", value: "7d", days: "7" },
  { label: "1M", value: "30d", days: "30" },
  { label: "3M", value: "90d", days: "90" },
  { label: "1Y", value: "365d", days: "365" },
];

export default function CoinDetail() {
  const [, params] = useRoute("/coin/:id");
  const [, setLocation] = useLocation();
  const coinId = params?.id || "bitcoin";
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES[1]);
  const { currency, format } = useCurrency();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch Coin Details
  const { data: coin, isLoading: loadingCoin } = useQuery({
    queryKey: ["coin", coinId],
    queryFn: async () => {
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
      if (!res.ok) throw new Error("Failed to fetch coin data");
      return res.json();
    },
  });

  // Fetch Chart Data
  const { data: chartData, isLoading: loadingChart } = useQuery({
    queryKey: ["coinChart", coinId, selectedTimeframe.days, currency],
    queryFn: async () => {
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${currency.toLowerCase()}&days=${selectedTimeframe.days}`);
      if (!res.ok) throw new Error("Failed to fetch chart data");
      const data = await res.json();
      
      // Transform data for Recharts
      return data.prices.map(([timestamp, price]: [number, number]) => ({
        date: timestamp,
        price: price,
      }));
    },
  });

  if (loadingCoin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!coin) {
    return <div className="min-h-screen bg-black text-white p-6">Coin not found</div>;
  }

  const isPositive = coin.market_data.price_change_percentage_24h >= 0;
  const currencyLower = currency.toLowerCase();
  
  // Access dynamic currency properties safely
  const currentPrice = coin.market_data.current_price[currencyLower];
  const marketCap = coin.market_data.market_cap[currencyLower];
  const totalVolume = coin.market_data.total_volume[currencyLower];
  const high24h = coin.market_data.high_24h[currencyLower];
  const low24h = coin.market_data.low_24h[currencyLower];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md p-4 flex items-center gap-4 border-b border-white/10">
        <button 
          onClick={() => setLocation("/")}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <img src={coin.image.small} alt={coin.name} className="w-8 h-8 rounded-full" />
          <div>
            <h1 className="font-bold text-lg leading-none">{coin.name}</h1>
            <span className="text-xs text-gray-400 uppercase">{coin.symbol}</span>
          </div>
        </div>
        <div className="ml-auto flex flex-col items-end">
          <span className="font-bold text-lg">{format(currentPrice)}</span>
          <span className={cn("text-xs flex items-center", isPositive ? "text-cyan-400" : "text-pink-500")}>
            {isPositive ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
            {coin.market_data.price_change_percentage_24h.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-md mx-auto">
        
        {/* Chart Section */}
        <div className="space-y-4">
          <div className="h-[250px] w-full -mx-2 relative group">
            <button 
                onClick={() => setIsFullscreen(true)}
                className="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-lg text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Maximize2 size={16} />
            </button>
            {loadingChart ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">Loading Chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isPositive ? "#06b6d4" : "#ec4899"} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={isPositive ? "#06b6d4" : "#ec4899"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    hide 
                    type="number" 
                    domain={['dataMin', 'dataMax']} 
                  />
                  <YAxis 
                    hide 
                    domain={['auto', 'auto']} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    formatter={(value: number) => [format(value), "Price"]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={isPositive ? "#06b6d4" : "#ec4899"} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Timeframe Selector */}
          <div className="flex justify-between bg-white/5 p-1 rounded-xl">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.label}
                onClick={() => setSelectedTimeframe(tf)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  selectedTimeframe.value === tf.value
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-300"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Activity size={14} /> Market Cap
            </div>
            <div className="font-bold text-lg">{formatCompactNumber(marketCap)}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <BarChart3 size={14} /> Volume (24h)
            </div>
            <div className="font-bold text-lg">{formatCompactNumber(totalVolume)}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <TrendingUp size={14} /> 24h High
            </div>
            <div className="font-bold text-lg">{format(high24h)}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <TrendingDown size={14} /> 24h Low
            </div>
            <div className="font-bold text-lg">{format(low24h)}</div>
          </div>
        </div>

        {/* Info Section */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">About {coin.name}</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-gray-400 text-sm flex items-center gap-2">
                <Layers size={16} /> Rank
              </span>
              <span className="font-bold">#{coin.market_cap_rank}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-gray-400 text-sm flex items-center gap-2">
                <Calendar size={16} /> Created
              </span>
              <span className="font-bold">
                {coin.genesis_date ? new Date(coin.genesis_date).toLocaleDateString() : "N/A"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-gray-400 text-sm flex items-center gap-2">
                <Globe size={16} /> Website
              </span>
              <a 
                href={coin.links.homepage[0]} 
                target="_blank" 
                rel="noreferrer"
                className="text-cyan-400 text-sm hover:underline truncate max-w-[150px]"
              >
                {coin.links.homepage[0]?.replace('https://', '')}
              </a>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl mt-4">
            <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
              <DollarSign size={16} className="text-cyan-400" /> Supported Chains
            </h4>
            <div className="flex flex-wrap gap-2">
              {/* CoinGecko platforms object is key-value, we'll try to extract some or mock typical ones if empty */}
              {Object.keys(coin.platforms).length > 0 ? (
                Object.keys(coin.platforms).slice(0, 5).map((chain) => (
                  chain && (
                    <span key={chain} className="px-2 py-1 rounded-md bg-white/10 text-xs text-gray-300 capitalize">
                      {chain}
                    </span>
                  )
                ))
              ) : (
                <span className="text-xs text-gray-500">Native Chain ({coin.name})</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Chart Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col p-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold">{coin.name}</h2>
                    <span className="text-sm text-gray-400 uppercase">{coin.symbol}</span>
                </div>
                <button onClick={() => setIsFullscreen(false)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
                    <X size={24} />
                </button>
            </div>
            <div className="flex-1 bg-zinc-900/50 rounded-2xl border border-white/5 p-4 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                        <linearGradient id="colorPriceFullscreen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isPositive ? "#06b6d4" : "#ec4899"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={isPositive ? "#06b6d4" : "#ec4899"} stopOpacity={0}/>
                        </linearGradient>
                        </defs>
                        <XAxis 
                        dataKey="date" 
                        type="number" 
                        domain={['dataMin', 'dataMax']} 
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                        stroke="#555"
                        />
                        <YAxis 
                        domain={['auto', 'auto']} 
                        stroke="#555"
                        tickFormatter={(val) => format(val)}
                        width={60}
                        />
                        <Tooltip 
                        contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                        formatter={(value: number) => [format(value), "Price"]}
                        />
                        <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke={isPositive ? "#06b6d4" : "#ec4899"} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorPriceFullscreen)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}
    </div>
  );
}
