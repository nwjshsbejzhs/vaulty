import { useLocation, useRoute } from "wouter";
import { ChevronLeft, ArrowUp, Share2, Bookmark } from "lucide-react";
import { useState, useEffect } from "react";

export default function Article() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/academy/:slug");
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

  const slug = params?.slug;
  const title = slug ? slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : "Article";

  return (
    <div className="min-h-screen bg-black text-white pb-24">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/academy")} className="p-2 hover:bg-white/10 rounded-full">
                <ChevronLeft size={24} />
            </button>
            <h1 className="font-bold text-lg truncate max-w-[200px]">Article</h1>
            </div>
            <div className="flex gap-2">
                <button className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                    <Bookmark size={20} />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                    <Share2 size={20} />
                </button>
            </div>
        </div>

        <div className="max-w-md mx-auto p-6">
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4 inline-block">
                Learn
            </span>
            <h1 className="text-3xl font-bold mb-6 leading-tight">{title}</h1>
            
            <div className="flex items-center gap-3 mb-8 text-sm text-gray-500 border-b border-white/10 pb-6">
                <div className="w-8 h-8 rounded-full bg-gray-700" />
                <span>Vaulty Academy</span>
                <span>•</span>
                <span>5 min read</span>
            </div>

            <article className="prose prose-invert prose-lg">
                <p className="text-xl text-gray-300 mb-6">
                    This is a placeholder for the article content. In a real application, this would be fetched from a CMS or database based on the slug: <span className="text-cyan-400 font-mono">{slug}</span>.
                </p>
                
                <h2 className="text-2xl font-bold mt-8 mb-4 text-white">Introduction</h2>
                <p className="text-gray-400 mb-4 leading-relaxed">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>

                <div className="my-8 p-6 bg-white/5 border-l-4 border-cyan-500 rounded-r-xl">
                    <p className="italic text-gray-300">
                        "Investing is not about timing the market, but about time in the market."
                    </p>
                </div>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-white">Key Concepts</h2>
                <ul className="list-disc pl-5 space-y-2 text-gray-400 mb-6">
                    <li>Understanding risk vs reward</li>
                    <li>Diversification strategies</li>
                    <li>Long-term perspective</li>
                    <li>Consistent contribution</li>
                </ul>

                <p className="text-gray-400 mb-4 leading-relaxed">
                    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-white">Conclusion</h2>
                <p className="text-gray-400 mb-4 leading-relaxed">
                    Start small, stay consistent, and keep learning. Your future self will thank you.
                </p>
            </article>
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
