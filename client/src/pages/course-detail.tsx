import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { 
  ArrowLeft, Users, Clock, Star, 
  Share2, ShieldCheck, CheckCircle2,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { VaultyIcon } from "@/components/ui/vaulty-icon";
import { formatDistanceToNow } from "date-fns";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function CourseDetail() {
  const [match, params] = useRoute("/course/:id");
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);

  const courseId = params?.id;

  useEffect(() => {
    // In a real app, fetch from Firestore
    // For now, we'll simulate or fetch if it exists
    const fetchCourse = async () => {
      if (!courseId) return;
      
      try {
        const docRef = doc(db, "courses", courseId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setCourse({ id: docSnap.id, ...docSnap.data() });
        } else {
          // Mock data if not found (for prototype purposes)
          setCourse({
            id: courseId,
            title: "Advanced Crypto Trading Masterclass",
            description: "Learn the secrets of successful crypto trading from a 7-figure trader. This course covers technical analysis, risk management, and market psychology. You will get access to exclusive signals and a community of like-minded traders.",
            price: 99.99,
            subscribers: 1243,
            rating: 4.8,
            modules: 12,
            duration: "15h 30m",
            image: "https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=2664&auto=format&fit=crop",
            userId: "user123",
            username: "CryptoKing",
            userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CryptoKing",
            createdAt: new Date()
          });
        }
      } catch (error) {
        console.error("Error fetching course:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  }

  if (!course) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Course not found</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/earn")} className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold truncate flex-1">{course.title}</h1>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
          <Share2 size={20} />
        </Button>
      </div>

      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="relative rounded-xl overflow-hidden aspect-video w-full border border-white/10">
          <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
          <div className="absolute bottom-0 left-0 p-6 w-full">
            <Badge className="bg-cyan-500 text-black mb-2 hover:bg-cyan-600">
              Course
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{course.title}</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
              <div className="flex items-center gap-1">
                <Users size={14} className="text-cyan-400" />
                <span>{course.subscribers?.toLocaleString() || 0} enrolled</span>
              </div>
              <div className="flex items-center gap-1">
                <Star size={14} className="text-yellow-400" />
                <span>{course.rating || "New"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{course.duration || "Self-paced"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Creator Info */}
            <Card className="bg-zinc-900/50 border-white/10">
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-12 w-12 border border-white/10">
                  <AvatarImage src={course.userAvatar} />
                  <AvatarFallback>{course.username?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm text-gray-400">Created by</p>
                  <p className="font-semibold text-white">{course.username}</p>
                </div>
                <Button variant="outline" size="sm" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10">
                  View Profile
                </Button>
              </CardContent>
            </Card>

            {/* Description */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">About this Course</h3>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {course.description}
              </p>
            </div>

            {/* What you'll learn */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">What you'll learn</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-2 items-start text-gray-300 text-sm">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                    <span>Master key concepts and advanced strategies in this field.</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            {/* Pricing Card */}
            <Card className="bg-zinc-900 border-white/10 sticky top-24">
              <CardHeader>
                <CardTitle className="text-white">Subscribe Now</CardTitle>
                <CardDescription>Get full access to this course</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">${course.price}</span>
                  <span className="text-gray-400">/ month</span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex justify-between">
                    <span>Includes {course.modules || 10} modules</span>
                    <BookOpen size={16} />
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="flex justify-between">
                    <span>Certificate of completion</span>
                    <ShieldCheck size={16} />
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="flex justify-between">
                    <span>Community access</span>
                    <Users size={16} />
                  </div>
                </div>

                <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-6">
                  Enroll Now
                </Button>
                <p className="text-xs text-center text-gray-500">
                  30-day money-back guarantee
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
