import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Target, 
  Brain, 
  Calculator, 
  TrendingUp, 
  ShieldAlert, 
  Activity, 
  Receipt, 
  Newspaper, 
  Percent, 
  BookOpen,
  Lock,
  ArrowRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePremium } from "@/contexts/premium-context";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: "AI" | "Finance" | "Productivity" | "Analysis";
  isPremium: boolean;
  color: string;
}

const tools: Tool[] = [
  {
    id: "ai-goals",
    name: "AI Goal Analyzer",
    description: "Create smart financial goals and get AI-powered insights on how to achieve them faster.",
    icon: Target,
    category: "AI",
    isPremium: true,
    color: "text-purple-400"
  },
  {
    id: "market-sentiment",
    name: "Market Sentiment AI",
    description: "Real-time AI analysis of market trends and social sentiment.",
    icon: Brain,
    category: "AI",
    isPremium: true,
    color: "text-cyan-400"
  },
  {
    id: "smart-budget",
    name: "Smart Budget",
    description: "Calculate your monthly budget and savings potential.",
    icon: Calculator,
    category: "Finance",
    isPremium: false,
    color: "text-green-400"
  },
  {
    id: "crypto-converter",
    name: "Crypto Converter",
    description: "Instant conversion between top 100 cryptocurrencies and fiat.",
    icon: TrendingUp,
    category: "Finance",
    isPremium: false,
    color: "text-blue-400"
  },
  {
    id: "risk-calculator",
    name: "Risk Calculator",
    description: "Evaluate position sizing and potential risk for your trades.",
    icon: ShieldAlert,
    category: "Analysis",
    isPremium: false,
    color: "text-red-400"
  },
  {
    id: "portfolio-health",
    name: "Portfolio Health",
    description: "Comprehensive health score of your investment distribution.",
    icon: Activity,
    category: "Analysis",
    isPremium: true,
    color: "text-emerald-400"
  },
  {
    id: "tax-estimator",
    name: "Tax Estimator",
    description: "Estimate capital gains tax based on your trading history.",
    icon: Receipt,
    category: "Finance",
    isPremium: false,
    color: "text-orange-400"
  },
  {
    id: "news-aggregator",
    name: "Crypto News Feed",
    description: "Curated news feed specific to your watchlist assets.",
    icon: Newspaper,
    category: "Productivity",
    isPremium: false,
    color: "text-yellow-400"
  },
  {
    id: "compound-interest",
    name: "Compound Growth",
    description: "Visualize the power of compound interest over time.",
    icon: Percent,
    category: "Analysis",
    isPremium: false,
    color: "text-indigo-400"
  },
  {
    id: "trading-journal",
    name: "Trading Journal",
    description: "Log your trades and analyze your win/loss ratio.",
    icon: BookOpen,
    category: "Productivity",
    isPremium: true,
    color: "text-pink-400"
  }
];

export function ToolsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { isPremium } = usePremium();
  const { toast } = useToast();

  const filteredTools = tools.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToolClick = (tool: Tool) => {
    if (tool.isPremium && !isPremium) {
      toast({
        title: "Premium Feature",
        description: "This tool is available for Premium members only.",
        variant: "destructive",
      });
      return;
    }
    setSelectedTool(tool);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
          Tools & Utilities
        </h2>
        <p className="text-gray-400 text-sm">
          Powerful tools to supercharge your crypto journey
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
        <Input 
          placeholder="Search tools..." 
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-cyan-500/50 transition-colors"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Categories / Grid */}
      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {filteredTools.map((tool, index) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className={`
                  p-4 bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer relative overflow-hidden group
                  ${!isPremium && tool.isPremium ? 'opacity-75' : ''}
                `}
                onClick={() => handleToolClick(tool)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-white/5 ${tool.color}`}>
                    <tool.icon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">{tool.name}</h3>
                      {tool.isPremium && !isPremium && (
                        <Lock className="w-4 h-4 text-amber-400" />
                      )}
                      {tool.isPremium && isPremium && (
                        <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-[10px] px-1 py-0 h-4">
                          PREMIUM
                        </Badge>
                      )}
                      {!tool.isPremium && (
                        <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px] px-1 py-0 h-4">
                          FREE
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {tool.description}
                    </p>
                  </div>
                  
                  <div className="self-center">
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredTools.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No tools found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Tool Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg bg-white/5 ${selectedTool?.color}`}>
                {selectedTool && <selectedTool.icon className="w-5 h-5" />}
              </div>
              <DialogTitle>{selectedTool?.name}</DialogTitle>
            </div>
            <DialogDescription className="text-gray-400">
              {selectedTool?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {selectedTool?.id === 'ai-goals' && (
              <GoalAnalyzerContent />
            )}
            {selectedTool?.id !== 'ai-goals' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-black/20 border border-white/5 text-center py-8">
                  <p className="text-sm text-gray-400">Tool interface would load here...</p>
                </div>
                <Button className="w-full bg-cyan-600 hover:bg-cyan-500" onClick={() => setIsDialogOpen(false)}>
                  Start Using Tool
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalAnalyzerContent() {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    if (!goal) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setStep(1);
    }, 2000);
  };

  if (step === 1) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <h4 className="text-sm font-medium text-purple-400 mb-1 flex items-center gap-2">
            <Brain className="w-3 h-3" /> AI Analysis
          </h4>
          <p className="text-sm text-gray-300">
            Based on your goal, I recommend breaking this down into 3 milestones. The market conditions are currently favorable for this strategy.
          </p>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">Suggested Milestones</Label>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/5">
                <div className="w-4 h-4 rounded-full border border-gray-600 flex items-center justify-center">
                  <span className="text-[8px]">{i}</span>
                </div>
                <span className="text-xs text-gray-300">Milestone {i}: Generated step...</span>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full bg-purple-600 hover:bg-purple-500" onClick={() => setStep(0)}>
          Create Another Goal
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>What is your financial goal?</Label>
        <Textarea 
          placeholder="e.g. Save $10,000 for a down payment in 6 months..."
          className="bg-black/20 border-white/10 text-white min-h-[100px]"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </div>
      <Button 
        className="w-full bg-purple-600 hover:bg-purple-500" 
        onClick={handleAnalyze}
        disabled={isAnalyzing || !goal}
      >
        {isAnalyzing ? (
          <>
            <Brain className="w-4 h-4 mr-2 animate-pulse" />
            Analyzing...
          </>
        ) : (
          "Analyze Goal"
        )}
      </Button>
    </div>
  );
}
