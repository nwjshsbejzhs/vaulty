import { useState } from "react";
import { MoreVertical, Trash2, Sparkles, TrendingUp, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";
import { VaultyIcon } from "@/components/ui/vaulty-icon";

interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: any; // Firestore Timestamp
  imageUrl?: string;
}

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");

  const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  const deadlineDate = goal.deadline?.toDate ? goal.deadline.toDate() : new Date(goal.deadline);
  const daysLeft = differenceInDays(deadlineDate, new Date());
  
  const handleDelete = async () => {
    if (!user) return;
    if (confirm("Are you sure you want to delete this goal?")) {
      await deleteDoc(doc(db, "users", user.uid, "goals", goal.id));
    }
  };

  const handleAnalyze = () => {
    setAnalyzing(true);
    setAnalysisOpen(true);
    
    // Mock AI Analysis
    setTimeout(() => {
      const dailySaving = (goal.targetAmount - goal.currentAmount) / Math.max(1, daysLeft);
      const isOnTrack = dailySaving < (goal.targetAmount * 0.01); // Arbitrary logic
      
      let advice = "";
      if (daysLeft < 0) {
        advice = "This goal is past its deadline. Consider adjusting the timeline or prioritizing a lump sum contribution.";
      } else if (progress >= 100) {
        advice = "Congratulations! You've reached your goal. Time to set a new one!";
      } else {
        advice = `To reach your goal of ${goal.targetAmount.toLocaleString()} Credits by ${deadlineDate.toLocaleDateString()}, you need to save approximately ${dailySaving.toLocaleString()} Credits per day. ${isOnTrack ? "You are on track!" : "You might need to increase your savings rate."} Consider setting up automatic transfers to stay consistent.`;
      }
      
      setAnalysisResult(advice);
      setAnalyzing(false);
    }, 2000);
  };

  return (
    <>
      <div className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all">
        {/* Header Image */}
        <div className="h-32 w-full bg-gradient-to-r from-blue-900/40 to-cyan-900/40 relative">
          {goal.imageUrl ? (
            <img src={goal.imageUrl} alt={goal.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <TrendingUp className="text-white/20 w-16 h-16" />
            </div>
          )}
          
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors">
                  <MoreVertical size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#111] border-white/10 text-white">
                <DropdownMenuItem onClick={handleAnalyze} className="cursor-pointer hover:bg-white/10">
                  <Sparkles className="mr-2 h-4 w-4 text-purple-400" />
                  <span>AI Analyze</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-red-400 hover:bg-red-500/10 hover:text-red-400">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg leading-tight">{goal.title}</h3>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                <Calendar size={12} />
                <span>{daysLeft > 0 ? `${daysLeft} days left` : "Expired"}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-cyan-400">{Math.round(progress)}%</div>
            </div>
          </div>

          <div className="space-y-2">
            <Progress value={progress} className="h-2 bg-white/10" indicatorClassName={cn("bg-gradient-to-r from-cyan-500 to-blue-500", progress >= 100 && "from-green-500 to-emerald-500")} />
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 flex items-center gap-1">
                Current: 
                <span className="text-white font-medium inline-flex items-center gap-1">
                    <VaultyIcon size={10} />{goal.currentAmount.toLocaleString()}
                </span>
              </span>
              <span className="text-gray-400 flex items-center gap-1">
                Goal: 
                <span className="text-white font-medium inline-flex items-center gap-1">
                    <VaultyIcon size={10} />{goal.targetAmount.toLocaleString()}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Dialog */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="text-purple-400" size={20} />
              AI Goal Analysis
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Smart insights for "{goal.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
                <p className="text-sm text-gray-400 animate-pulse">Analyzing financial data...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                  <p className="text-sm leading-relaxed text-gray-200">
                    {analysisResult}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setAnalysisOpen(false)} className="w-full bg-white/10 hover:bg-white/20">
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
