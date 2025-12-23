import { Link } from "wouter";
import { useDemoStore } from "@/hooks/use-demo-store";
import { useCurrency } from "@/contexts/currency-context";
import { TrendingUp, Wallet } from "lucide-react";
import { useMemo } from "react";
import { VaultyIcon } from "@/components/ui/vaulty-icon";

interface DemoBalanceCardProps {
  coins?: any[];
}

export function DemoBalanceCard({ coins = [] }: DemoBalanceCardProps) {
  const { balance, holdings } = useDemoStore();
  const { symbol } = useCurrency();

  const portfolioValue = useMemo(() => {
    return holdings.reduce((total, holding) => {
      const coin = coins.find((c) => c.id === holding.coinId);
      const price = coin ? coin.current_price : holding.averageBuyPrice;
      return total + (holding.amount * price);
    }, 0);
  }, [holdings, coins]);

  const totalBalance = balance + portfolioValue;
  const profit = totalBalance - 10000; // Assuming 10k start
  const profitPercent = (profit / 10000) * 100;
  const isPositive = profit >= 0;

  return (
    <Link href="/demo-trading">
      <div className="glass-card rounded-3xl p-6 hover:bg-white/10 transition-all cursor-pointer group relative overflow-hidden border border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-transparent">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-500/20 transition-colors" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                <Wallet className="w-3 h-3" />
                Demo Portfolio
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white tracking-tight flex items-center gap-1">
                  <VaultyIcon size={24} />
                  {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className={`text-xs font-bold mt-1 flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}
                <VaultyIcon size={10} />
                {Math.abs(profit).toLocaleString(undefined, { maximumFractionDigits: 2 })} 
                <span className="opacity-70">({profitPercent.toFixed(2)}%)</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
