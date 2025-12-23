import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, ArrowUp, BookOpen, TrendingUp, Cpu, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Academy() {
  const [location, setLocation] = useLocation();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const categories = [
    { id: "finance", name: "Finance", icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
    { id: "crypto", name: "Crypto", icon: Globe, color: "text-blue-400", bg: "bg-blue-500/10" },
    { id: "ai", name: "AI World", icon: Cpu, color: "text-purple-400", bg: "bg-purple-500/10" },
  ];

  const articles = [
    // Finance
    { slug: "how-to-start-investing", title: "How to Start Investing", category: "finance", readTime: "5 min" },
    { slug: "budgeting-101", title: "Budgeting 101: Master Your Money", category: "finance", readTime: "4 min" },
    { slug: "understanding-compound-interest", title: "The Magic of Compound Interest", category: "finance", readTime: "3 min" },
    { slug: "stocks-vs-bonds", title: "Stocks vs Bonds: What's the Difference?", category: "finance", readTime: "6 min" },
    { slug: "emergency-funds", title: "Why You Need an Emergency Fund", category: "finance", readTime: "4 min" },
    { slug: "retirement-planning", title: "Retirement Planning for Beginners", category: "finance", readTime: "7 min" },
    { slug: "credit-scores-explained", title: "Credit Scores Explained", category: "finance", readTime: "5 min" },
    { slug: "passive-income-ideas", title: "Top 10 Passive Income Ideas", category: "finance", readTime: "8 min" },
    { slug: "tax-basics", title: "Tax Basics Everyone Should Know", category: "finance", readTime: "6 min" },
    { slug: "financial-freedom-steps", title: "7 Steps to Financial Freedom", category: "finance", readTime: "10 min" },

    // Crypto
    { slug: "what-is-bitcoin", title: "What is Bitcoin?", category: "crypto", readTime: "5 min" },
    { slug: "blockchain-explained", title: "Blockchain Technology Explained", category: "crypto", readTime: "6 min" },
    { slug: "ethereum-vs-bitcoin", title: "Ethereum vs Bitcoin", category: "crypto", readTime: "5 min" },
    { slug: "how-to-buy-crypto", title: "How to Buy Your First Crypto", category: "crypto", readTime: "4 min" },
    { slug: "crypto-wallets-guide", title: "Crypto Wallets: A Complete Guide", category: "crypto", readTime: "7 min" },
    { slug: "defi-explained", title: "What is DeFi?", category: "crypto", readTime: "6 min" },
    { slug: "nfts-guide", title: "NFTs: Digital Ownership Explained", category: "crypto", readTime: "5 min" },
    { slug: "crypto-security-tips", title: "Top Crypto Security Tips", category: "crypto", readTime: "4 min" },
    { slug: "altcoins-to-watch", title: "Understanding Altcoins", category: "crypto", readTime: "5 min" },
    { slug: "future-of-crypto", title: "The Future of Cryptocurrency", category: "crypto", readTime: "8 min" },

    // AI
    { slug: "ai-revolution", title: "The AI Revolution is Here", category: "ai", readTime: "5 min" },
    { slug: "machine-learning-basics", title: "Machine Learning Basics", category: "ai", readTime: "6 min" },
    { slug: "generative-ai", title: "What is Generative AI?", category: "ai", readTime: "5 min" },
    { slug: "ai-in-finance", title: "AI in Finance: Changing the Game", category: "ai", readTime: "7 min" },
    { slug: "chatgpt-guide", title: "How to Use ChatGPT Effectively", category: "ai", readTime: "4 min" },
    { slug: "future-of-work-ai", title: "AI and the Future of Work", category: "ai", readTime: "6 min" },
    { slug: "ethical-ai", title: "Ethical Considerations in AI", category: "ai", readTime: "5 min" },
    { slug: "ai-tools-productivity", title: "Top AI Tools for Productivity", category: "ai", readTime: "5 min" },
    { slug: "computer-vision", title: "Understanding Computer Vision", category: "ai", readTime: "7 min" },
    { slug: "ai-investing", title: "Investing in AI Companies", category: "ai", readTime: "6 min" },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <h1 className="font-bold text-lg">Academy</h1>
        </div>
      </div>

      <div className="p-4 space-y-8 max-w-md mx-auto">
        
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 p-6">
            <div className="relative z-10">
                <BookOpen className="w-10 h-10 text-blue-400 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Learn & Earn</h2>
                <p className="text-gray-300 text-sm">Master financial concepts and stay ahead of the curve.</p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>

        {/* Categories */}
        {categories.map((cat) => (
            <div key={cat.id} className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-lg", cat.bg)}>
                        <cat.icon className={cn("w-5 h-5", cat.color)} />
                    </div>
                    <h3 className="font-bold text-lg">{cat.name}</h3>
                </div>
                
                <div className="space-y-3">
                    {articles.filter(a => a.category === cat.id).map((article, idx) => (
                        <Link key={article.slug} href={`/academy/${article.slug}`}>
                            <div className="group bg-white/5 border border-white/5 hover:bg-white/10 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02]">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium group-hover:text-cyan-400 transition-colors">{article.title}</h4>
                                        <p className="text-xs text-gray-500 mt-1">{article.readTime} read</p>
                                    </div>
                                    <span className="text-xs font-mono text-gray-600">#{idx + 1}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        ))}

      </div>

      {/* Scroll to Top */}
      {showScrollTop && (
        <button 
            onClick={scrollToTop}
            className="fixed bottom-24 right-6 p-3 bg-cyan-500 text-black rounded-full shadow-lg shadow-cyan-500/20 animate-in fade-in zoom-in duration-300 hover:scale-110 transition-transform z-50"
        >
            <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
