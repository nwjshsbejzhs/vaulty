import { useState, useEffect } from "react";
import { Plus, Target } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { GoalCard } from "./goal-card";
import { CreateGoalDialog } from "./create-goal-dialog";

export function GoalsView() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "users", user.uid, "goals"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const goalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGoals(goalsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Goals</h2>
          <p className="text-gray-400 text-sm">Track and achieve your dreams</p>
        </div>
        <button 
          onClick={() => setCreateOpen(true)}
          className="p-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:scale-105 transition-transform active:scale-95"
        >
          <Plus size={24} />
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl bg-white/5 border border-white/5 border-dashed">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-gray-500">
            <Target size={32} />
          </div>
          <h3 className="text-lg font-bold mb-2">No goals yet</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
            Start your journey by setting a financial goal. Whether it's a new car, a house, or a dream vacation.
          </p>
          <button 
            onClick={() => setCreateOpen(true)}
            className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            Create First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      <CreateGoalDialog 
        open={createOpen} 
        onOpenChange={setCreateOpen} 
        currentGoalCount={goals.length}
      />
    </div>
  );
}
