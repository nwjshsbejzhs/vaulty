import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useDemoStore } from "@/hooks/use-demo-store";
import { getCoinDetail, getMarketChart, type Coin } from "@/lib/coingecko";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Loader2, ArrowLeft as ArrowLeftIcon, LayoutGrid, Sparkles, FileText, User, Maximize2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer, YAxis, XAxis, Tooltip } from "recharts";
import { useCurrency } from "@/contexts/currency-context";
import { format as formatDate } from "date-fns";

export default function DemoCoinDetail() {
  const [match, params] = useRoute("/demo-trading/:id");
  const { balance, holdings, buyCoin, sellCoin } = useDemoStore();
  const { currency, symbol: currencySymbol, convert } = useCurrency();
  const [coin, setCoin] = useState<Coin | null>(null);
  const [chartData, setChartData] = useState<{ x: number; y: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();

  const id = params?.id;

  useEffect(() => {
    if (id) {
      loadCoin(id);
    }
  }, [id, currency]);

  const loadCoin = async (coinId: string) => {
    setLoading(true);
    const [coinData, chartData] = await Promise.all([
        getCoinDetail(coinId, currency.toLowerCase()),
        getMarketChart(coinId, 1, currency.toLowerCase()) // 1 day chart
    ]);
    setCoin(coinData);
    setChartData(chartData);
    setLoading(false);
  };

  const handleTrade = () => {
    if (!coin || !amount) return;
    try {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) throw new Error("Invalid amount");

        if (tradeType === 'buy') {
            const coinsToBuy = numAmount / coin.current_price;
            buyCoin(coin.id, coin.symbol, coinsToBuy, coin.current_price);
            toast({
                title: "Purchase Successful",
                description: `Bought ${coinsToBuy.toFixed(6)} ${coin.symbol.toUpperCase()} for ${currencySymbol}${numAmount}`,
            });
        } else {
            const coinsToSell = numAmount / coin.current_price;
            sellCoin(coin.id, coin.symbol, coinsToSell, coin.current_price);
            toast({
                title: "Sale Successful",
                description: `Sold ${coinsToSell.toFixed(6)} ${coin.symbol.toUpperCase()} for ${currencySymbol}${numAmount}`,
            });
        }
        setAmount("");
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const setMaxAmount = () => {
      if (tradeType === 'buy') {
          // Convert balance (USD) to current currency for max amount
          setAmount(convert(balance).toString());
      } else {
          // Calculate max sell value in selected currency
          if (!coin) return;
          const userHolding = holdings.find(h => h.coinId === coin.id);
          const holdingAmount = userHolding ? userHolding.amount : 0;
          const maxSellValue = holdingAmount * coin.current_price;
          setAmount(maxSellValue.toFixed(2));
      }
  }

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white"><div className="text-purple-500 font-bold text-sm animate-pulse">LOADING...</div></div>;
  }

  if (!coin) {
    return <div className="min-h-screen bg-black text-white p-8">Coin not found</div>;
  }

  const isPositive = coin.price_change_percentage_24h >= 0;
  const chartColor = isPositive ? "#22c55e" : "#ef4444"; // Green or Red
  const gradientId = "chartGradient";

  // Display available balance in current currency
  const displayBalance = convert(balance);

  return (
    <div className="min-h-screen bg-black text-white pb-32 font-sans overflow-hidden">
       {/* Header */}
       <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-md pt-4 px-4 pb-2">
           <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                   <Link href="/demo-trading">
                       <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-white font-bold text-sm">
                           {"<"} BACK
                       </button>
                   </Link>
                   <div className="flex items-center gap-3">
                       <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
                       <div>
                           <h1 className="font-bold text-lg leading-tight">{coin.name}</h1>
                           <p className="text-[10px] text-gray-400 tracking-wider font-bold">DEMO TRADING</p>
                       </div>
                   </div>
               </div>
               <div className="text-right">
                   <div className="font-bold text-lg">{currencySymbol}{coin.current_price.toLocaleString()}</div>
                   <div className={cn("text-xs font-bold flex items-center justify-end gap-1", isPositive ? "text-green-500" : "text-[#ff6b6b]")}>
                       {isPositive ? "+" : ""}{coin.price_change_percentage_24h.toFixed(2)}%
                   </div>
               </div>
           </div>
       </div>

       {/* Chart Area */}
       <div className="h-[350px] w-full mt-4 relative group">
           <button 
                onClick={() => setIsFullscreen(true)}
                className="absolute top-2 right-4 z-10 p-2 bg-black/50 rounded-lg text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Maximize2 size={16} />
            </button>
           {/* Chart Container */}
           <div className="absolute inset-0 top-0 bottom-10 px-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <YAxis domain={['auto', 'auto']} hide />
                        <Area 
                            type="monotone" 
                            dataKey="y" 
                            stroke={chartColor} 
                            strokeWidth={2}
                            fill={`url(#${gradientId})`} 
                        />
                    </AreaChart>
                </ResponsiveContainer>
           </div>
       </div>

       {/* Trading Panel - Matching Screenshot 2 */}
       <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-black">
            <div className="max-w-md mx-auto relative z-10">
                <div className="bg-[#111] border border-white/10 rounded-[2rem] p-5 space-y-6">
                    
                    {/* Buy/Sell Tabs */}
                    <div className="grid grid-cols-2 p-1 bg-black rounded-xl">
                        <button 
                            onClick={() => setTradeType('buy')}
                            className={cn("py-3 rounded-lg font-bold text-sm transition-all", tradeType === 'buy' ? "bg-[#22c55e] text-black shadow-lg shadow-green-500/20" : "text-gray-500 hover:text-gray-300")}
                        >
                            Buy
                        </button>
                        <button 
                            onClick={() => setTradeType('sell')}
                            className={cn("py-3 rounded-lg font-bold text-sm transition-all", tradeType === 'sell' ? "bg-[#ef4444] text-white shadow-lg shadow-red-500/20" : "text-gray-500 hover:text-gray-300")}
                        >
                            Sell
                        </button>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 ml-1">Amount in {currency}</label>
                        <div className="relative bg-black rounded-2xl border border-white/10 flex items-center px-4 py-4">
                            <input 
                                type="number" 
                                placeholder="0.00" 
                                className="w-full bg-transparent text-2xl font-bold text-white placeholder:text-gray-600 focus:outline-none"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                            <button 
                                onClick={setMaxAmount}
                                className="text-xs font-bold text-purple-400 hover:text-purple-300 ml-2 px-2 py-1 rounded hover:bg-white/5 transition-colors"
                            >
                                MAX
                            </button>
                        </div>
                        <div className="flex justify-between px-1">
                            <span className="text-xs text-gray-500">Available:</span>
                            <span className="text-xs font-mono text-white">{currencySymbol}{displayBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                        className={cn(
                            "w-full h-14 rounded-2xl text-lg font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]",
                            tradeType === 'buy' 
                                ? "bg-gradient-to-r from-green-500 to-green-600 text-black hover:from-green-400 hover:to-green-500" 
                                : "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500"
                        )}
                        onClick={handleTrade}
                    >
                        {tradeType === 'buy' ? `Buy ${coin.symbol.toUpperCase()}` : `Sell ${coin.symbol.toUpperCase()}`}
                    </Button>
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
                        <linearGradient id="colorPriceFullscreenDemo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                        </linearGradient>
                        </defs>
                        <XAxis 
                        dataKey="x" 
                        type="number" 
                        domain={['dataMin', 'dataMax']} 
                        tickFormatter={(val) => formatDate(new Date(val), 'MMM d, H:mm')}
                        stroke="#555"
                        />
                        <YAxis 
                        domain={['auto', 'auto']} 
                        stroke="#555"
                        width={60}
                        />
                        <Tooltip 
                        contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                        formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, "Price"]}
                        />
                        <Area 
                        type="monotone" 
                        dataKey="y" 
                        stroke={chartColor} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorPriceFullscreenDemo)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}
    </div>
  );
}
