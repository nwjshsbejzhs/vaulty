import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useDemoStore } from "@/hooks/use-demo-store";
import { getTopCoins, searchCoins, type Coin } from "@/lib/coingecko";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, ChevronLeft, Loader2, RefreshCcw, LayoutGrid, Sparkles, FileText, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/currency-context";
import { VaultyIcon } from "@/components/ui/vaulty-icon";

export default function DemoTrading() {
  const { balance, holdings, transactions } = useDemoStore();
  const { currency, symbol: currencySymbol, convert } = useCurrency();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [portfolioValue, setPortfolioValue] = useState(0);

  useEffect(() => {
    loadCoins();
  }, [currency]);

  useEffect(() => {
    const calculatePortfolio = async () => {
      let total = 0;
      for (const holding of holdings) {
        const coin = coins.find(c => c.id === holding.coinId);
        if (coin) {
          total += holding.amount * coin.current_price;
        } else {
             // Fallback for mock coins (Magnetix) - convert stored price (USD) to current currency
             const convertedPrice = convert(holding.averageBuyPrice);
             total += holding.amount * convertedPrice;
        }
      }
      setPortfolioValue(total);
    };
    calculatePortfolio();
  }, [holdings, coins, currency, convert]);

  const loadCoins = async () => {
    setLoading(true);
    const data = await getTopCoins(currency.toLowerCase());
    setCoins(data);
    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return loadCoins();
    
    setLoading(true);
    const results = await searchCoins(searchQuery, currency.toLowerCase());
    setCoins(results);
    setLoading(false);
  };

  // Convert stored balance (USD) to current currency
  const displayBalance = convert(balance);
  const totalBalance = displayBalance + portfolioValue;
  const investedAmount = portfolioValue;

  return (
    <div className="min-h-screen bg-black text-white pb-32 font-sans selection:bg-purple-500/30">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-md">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold">Demo Trading</h1>
            <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 text-sm font-bold" onClick={loadCoins}>
                <RefreshCcw className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-8">
        {/* Balance Card - Matching Screenshot 1 */}
        <div className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-[#2a1b3d] to-[#1a1025] border border-white/5 shadow-2xl">
            {/* Background Wallet Text Faded */}
            <div className="absolute right-[-20px] top-[20px] text-white/[0.03] rotate-[-10deg] font-bold text-9xl">
                <VaultyIcon size={180} className="opacity-10" />
            </div>
            
            <div className="relative z-10 space-y-6">
                <div>
                    <p className="text-gray-400 text-sm mb-1">Total Demo Balance</p>
                    <div className="text-4xl font-bold text-white tracking-tight flex items-center gap-2">
                        <VaultyIcon size={36} />
                        {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <p className="text-gray-400 text-xs mb-1">Cash Available</p>
                        <p className="text-lg font-mono text-white flex items-center gap-1">
                            <VaultyIcon size={16} />
                            {displayBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div>
                         <p className="text-gray-400 text-xs mb-1">Invested</p>
                         <p className="text-lg font-mono text-white flex items-center gap-1">
                            <VaultyIcon size={16} />
                            {investedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Holdings Section */}
        <div className="space-y-4">
            <h2 className="font-bold text-xl px-1">Your Holdings</h2>
            {holdings.length === 0 ? (
                <div className="text-center py-10 rounded-[2rem] bg-[#111] border border-white/5">
                    <p className="text-gray-500 text-sm">No active holdings</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {holdings.map((holding) => {
                        const coin = coins.find(c => c.id === holding.coinId);
                        // Convert average buy price from USD to current currency
                        const avgBuyPrice = convert(holding.averageBuyPrice);
                        
                        // If coin exists (CoinGecko), current_price is already converted. 
                        // If not (Magnetix), convert stored averageBuyPrice as proxy for current price (or use stored current price if we had it)
                        const currentPrice = coin ? coin.current_price : avgBuyPrice;
                        
                        const currentValue = holding.amount * currentPrice;
                        const costBasis = holding.amount * avgBuyPrice;
                        const profit = currentValue - costBasis;
                        const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;

                        return (
                            <Link key={holding.coinId} href={`/demo-trading/${holding.coinId}`}>
                                <div className="flex items-center justify-between p-5 rounded-[2rem] bg-[#111] border border-white/5 active:scale-[0.98] transition-transform cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-white/5 p-2 flex items-center justify-center">
                                            {coin ? (
                                                <img src={coin.image} alt={coin.name} className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                <span className="font-bold text-xs">{holding.coinId.substring(0, 2).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg uppercase">{coin?.symbol || holding.coinId}</p>
                                            <p className="text-sm text-gray-500">{holding.amount.toFixed(4)} {coin?.symbol?.toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg flex items-center justify-end gap-1">
                                            <VaultyIcon size={14} />
                                            {currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <p className={cn("text-sm font-medium", profit >= 0 ? "text-[#ff6b6b]" : "text-[#ff6b6b]")}>
                                            <span className={profit >= 0 ? "text-green-500 flex items-center justify-end gap-1" : "text-[#ff6b6b] flex items-center justify-end gap-1"}>
                                                 {profit >= 0 ? '+' : ''}
                                                 <VaultyIcon size={10} />
                                                 {Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({profitPercent.toFixed(2)}%)
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>

        <div className="space-y-4">
            <h2 className="font-bold text-xl px-1">Market</h2>
            
            <form onSubmit={handleSearch} className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">SEARCH</div>
                <input 
                    type="text"
                    placeholder="Search coins..." 
                    className="w-full bg-[#111] border border-white/5 rounded-full py-4 pl-20 pr-6 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </form>

            <div className="space-y-3">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="text-purple-500 font-bold text-sm animate-pulse">LOADING...</div>
                    </div>
                ) : coins.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No coins found</div>
                ) : (
                    coins.map((coin) => (
                        <Link key={coin.id} href={`/demo-trading/${coin.id}`}>
                            <div className="flex justify-between items-center p-4 rounded-[2rem] bg-black hover:bg-[#111] transition-colors cursor-pointer group">
                                <div className="flex gap-4 items-center">
                                    <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full object-cover" />
                                    <div>
                                        <div className="font-bold text-base">{coin.name}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-base flex items-center justify-end gap-1">
                                        <VaultyIcon size={14} />
                                        {coin.current_price.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>

        {/* Transactions Section */}
        {transactions.length > 0 && (
            <div className="space-y-4">
                <h2 className="font-bold text-xl px-1">Recent Activity</h2>
                <div className="space-y-3">
                    {transactions.slice(0, 5).map((tx) => {
                        // Convert stored transaction values (USD) to current currency
                        const convertedTotal = convert(tx.totalValue);
                        const convertedPrice = convert(tx.priceAtTransaction);
                        
                        return (
                        <div key={tx.id} className="flex items-center justify-between p-4 rounded-[2rem] bg-[#111] border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className={cn("h-10 w-10 flex items-center justify-center font-bold text-2xl", tx.type === 'buy' ? 'text-green-500' : 'text-red-500')}>
                                    {tx.type === 'buy' ? '+' : '-'}
                                </div>
                                <div>
                                    <p className="font-bold text-base text-white">
                                        {tx.type === 'buy' ? 'Bought' : 'Sold'} {tx.coinSymbol.toUpperCase()}
                                    </p>
                                    <p className="text-xs text-gray-500">{format(new Date(tx.date), 'MMM d, HH:mm')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-base text-white flex items-center justify-end gap-1">
                                    <VaultyIcon size={14} />
                                    {convertedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                                    {tx.amount.toFixed(4)} @ <VaultyIcon size={10} />
                                    {convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        )}

      </div>

    </div>
  );
}