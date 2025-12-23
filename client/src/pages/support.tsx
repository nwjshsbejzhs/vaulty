import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Send, AlertCircle, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Support() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
        setIsSubmitting(false);
        toast({
            title: "Support Ticket Created",
            description: "We have received your report and will get back to you shortly.",
            className: "bg-green-500 border-none text-white"
        });
        setLocation("/settings");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <button onClick={() => setLocation("/settings")} className="p-2 hover:bg-white/10 rounded-full">
             <ChevronLeft size={24} />
           </button>
           <h1 className="font-bold text-lg">Help Center</h1>
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto space-y-8">
        
        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3 items-start">
            <HelpCircle className="text-blue-400 shrink-0 mt-0.5" size={20} />
            <div>
                <h3 className="font-bold text-blue-400 text-sm mb-1">Need Assistance?</h3>
                <p className="text-xs text-blue-200/70">
                    Fill out the form below to report a bug, account issue, or general inquiry. Our team typically responds within 24 hours.
                </p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Issue Type</label>
                <Select required>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10 text-white">
                        <SelectItem value="bug">Report a Bug</SelectItem>
                        <SelectItem value="account">Account Issue</SelectItem>
                        <SelectItem value="payment">Payment/Premium</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Subject</label>
                <Input placeholder="Brief summary of the issue" className="bg-white/5 border-white/10 text-white" required />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Description</label>
                <Textarea 
                    placeholder="Please describe your issue in detail..." 
                    className="bg-white/5 border-white/10 text-white min-h-[150px]" 
                    required 
                />
            </div>

            <Button 
                type="submit" 
                className="w-full bg-cyan-600 hover:bg-cyan-700 font-bold"
                disabled={isSubmitting}
            >
                {isSubmitting ? "Submitting..." : "Submit Ticket"} <Send size={16} className="ml-2" />
            </Button>
        </form>

        <div className="text-center text-xs text-gray-500">
            For immediate assistance, you can also email us at support@vaulty.com
        </div>

      </div>
    </div>
  );
}
