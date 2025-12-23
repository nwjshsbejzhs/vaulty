import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { 
  Plus, MessageSquare, Briefcase, 
  DollarSign, Clock, AlertTriangle, 
  Loader2, Ghost, BookOpen, Users, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { formatDistanceToNow } from "date-fns";
import { db } from "@/lib/firebase";
import { 
  collection, query, orderBy, onSnapshot, 
  addDoc, serverTimestamp, where
} from "firebase/firestore";

import { VaultyIcon } from "@/components/ui/vaulty-icon";

interface Offer {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  userId: string;
  username: string;
  userAvatar?: string;
  createdAt: any;
  image?: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  price: number; // per month
  duration: string;
  userId: string;
  username: string;
  userAvatar?: string;
  createdAt: any;
  image?: string;
  subscribers?: number;
  rating?: number;
}

interface ChatPreview {
  id: string;
  withUserId: string;
  withUserName?: string;
  withUserAvatar?: string;
  lastMessage: string;
  timestamp: any;
  unread: boolean;
}

export default function EarnPage() {
  const [activeTab, setActiveTab] = useState("offers");
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, userData } = useAuth();
  
  const [offers, setOffers] = useState<Offer[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  // Post Offer/Course State
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [newOffer, setNewOffer] = useState({ title: "", description: "", price: "", duration: "24h" });
  const [newCourse, setNewCourse] = useState({ title: "", description: "", price: "", duration: "Self-paced" }); // price is per month
  const [isPosting, setIsPosting] = useState(false);

  // TOS Modal State
  const [isTOSOpen, setIsTOSOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  // Fetch Offers
  useEffect(() => {
    const q = query(
      collection(db, "offers"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOffers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Offer));
      setOffers(fetchedOffers);
      if (activeTab === 'offers') setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab]);

  // Fetch Courses (Real - No Mock Data)
  useEffect(() => {
    const q = query(
      collection(db, "courses"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCourses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Course));
      setCourses(fetchedCourses);
      if (activeTab === 'course') setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab]);


  // Fetch User Chats (Private)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      where("type", "==", "private"),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats = snapshot.docs.map(doc => {
        const data = doc.data();
        const otherUserId = data.participants.find((p: string) => p !== user.uid);
        
        return {
          id: doc.id,
          withUserId: otherUserId,
          lastMessage: data.lastMessage,
          timestamp: data.updatedAt,
          unread: false // TODO: Implement read status
        } as ChatPreview;
      });
      setChats(fetchedChats);
    });

    return () => unsubscribe();
  }, [user]);

  const handleContact = (offer: Offer) => {
    if (offer.userId === user?.uid) {
      toast({ title: "Error", description: "You cannot contact yourself!", variant: "destructive" });
      return;
    }
    setSelectedOffer(offer);
    setIsTOSOpen(true);
  };

  const handleAgreeTOS = () => {
    setIsTOSOpen(false);
    if (selectedOffer) {
      setLocation(`/chat/private/${selectedOffer.userId}`);
    }
  };

  const handlePostOffer = async () => {
    if (!user) return;

    // Validation
    if (!newOffer.title || !newOffer.description || !newOffer.price) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    const price = parseInt(newOffer.price);
    if (price < 100 || price > 1000000) {
      toast({ title: "Error", description: "Price must be between 100 and 1,000,000 Credits", variant: "destructive" });
      return;
    }

    setIsPosting(true);

    try {
      await addDoc(collection(db, "offers"), {
        title: newOffer.title,
        description: newOffer.description,
        price: price,
        duration: newOffer.duration,
        userId: user.uid,
        username: userData?.displayName || user.displayName || "User",
        userAvatar: userData?.photoURL || user.photoURL,
        createdAt: serverTimestamp()
      });

      toast({ title: "Success", description: "Offer posted successfully!" });
      setIsPostOpen(false);
      setNewOffer({ title: "", description: "", price: "", duration: "24h" });
    } catch (error) {
      console.error("Error posting offer:", error);
      toast({ title: "Error", description: "Failed to post offer", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!user) return;

    // Validation
    if (!newCourse.title || !newCourse.description || !newCourse.price) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    const price = parseFloat(newCourse.price);
    if (isNaN(price) || price <= 0) {
        toast({ title: "Error", description: "Invalid price", variant: "destructive" });
        return;
    }

    setIsPosting(true);

    try {
      await addDoc(collection(db, "courses"), {
        title: newCourse.title,
        description: newCourse.description,
        price: price,
        duration: newCourse.duration,
        userId: user.uid,
        username: userData?.displayName || user.displayName || "User",
        userAvatar: userData?.photoURL || user.photoURL,
        createdAt: serverTimestamp(),
        subscribers: 0,
        rating: 0
      });

      toast({ title: "Success", description: "Course created successfully!" });
      setIsPostOpen(false);
      setNewCourse({ title: "", description: "", price: "", duration: "Self-paced" });
    } catch (error) {
      console.error("Error creating course:", error);
      toast({ title: "Error", description: "Failed to create course", variant: "destructive" });
    } finally {
        setIsPosting(false);
    }
  };


  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Earn & Trade
        </h1>
        
        {(activeTab === 'offers' || activeTab === 'course') && (
            <Dialog open={isPostOpen} onOpenChange={setIsPostOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold gap-2">
                <Plus size={18} /> {activeTab === 'course' ? 'Create Course' : 'Post Offer'}
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white">
                <DialogHeader>
                <DialogTitle>{activeTab === 'course' ? 'Create a Course' : 'Post a New Offer'}</DialogTitle>
                <DialogDescription>
                    {activeTab === 'course' 
                    ? 'Share your knowledge and earn monthly subscription revenue.' 
                    : 'Create a listing to find services or offer your skills.'}
                </DialogDescription>
                </DialogHeader>
                
                {activeTab === 'course' ? (
                    // COURSE FORM
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Course Title</label>
                            <Input 
                                placeholder="e.g. Master React in 30 Days" 
                                className="bg-black/50 border-white/10"
                                value={newCourse.title}
                                onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Description</label>
                            <Textarea 
                                placeholder="What will students learn?" 
                                className="bg-black/50 border-white/10 min-h-[100px]"
                                value={newCourse.description}
                                onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Price ($/month)</label>
                                <div className="relative">
                                    <Input 
                                        type="number" 
                                        placeholder="99.99" 
                                        className="bg-black/50 border-white/10 pl-8"
                                        value={newCourse.price}
                                        onChange={e => setNewCourse({...newCourse, price: e.target.value})}
                                    />
                                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500">
                                        $
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Duration</label>
                                <Input 
                                    placeholder="e.g. 10h 30m"
                                    className="bg-black/50 border-white/10"
                                    value={newCourse.duration}
                                    onChange={e => setNewCourse({...newCourse, duration: e.target.value})}
                                />
                            </div>
                        </div>
                         {/* Optional Image Upload Placeholder */}
                        <div className="border border-dashed border-white/20 rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-white/5 transition-colors">
                            <Plus size={24} className="mb-2" />
                            <span className="text-xs">Add Cover Image (Optional)</span>
                        </div>
                    </div>
                ) : (
                    // OFFER FORM
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Title</label>
                            <Input 
                                placeholder="e.g. Looking for Web Developer" 
                                className="bg-black/50 border-white/10"
                                value={newOffer.title}
                                onChange={e => setNewOffer({...newOffer, title: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Description</label>
                            <Textarea 
                                placeholder="Describe what you need..." 
                                className="bg-black/50 border-white/10 min-h-[100px]"
                                value={newOffer.description}
                                onChange={e => setNewOffer({...newOffer, description: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Price (Credits)</label>
                            <div className="relative">
                                <Input 
                                type="number" 
                                placeholder="100 - 1,000,000" 
                                className="bg-black/50 border-white/10 pl-8"
                                value={newOffer.price}
                                onChange={e => setNewOffer({...newOffer, price: e.target.value})}
                                />
                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                                    <VaultyIcon size={14} />
                                </div>
                            </div>
                            </div>
                            <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Duration</label>
                            <select 
                                className="w-full h-10 px-3 rounded-md bg-black/50 border border-white/10 text-sm text-white"
                                value={newOffer.duration}
                                onChange={e => setNewOffer({...newOffer, duration: e.target.value})}
                            >
                                <option value="24h">24 Hours</option>
                                <option value="48h">48 Hours</option>
                                <option value="7d">7 Days</option>
                            </select>
                            </div>
                        </div>
                        {/* Optional Image Upload Placeholder */}
                        <div className="border border-dashed border-white/20 rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-white/5 transition-colors">
                            <Plus size={24} className="mb-2" />
                            <span className="text-xs">Add Cover Image (Optional)</span>
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsPostOpen(false)} className="border-white/10 hover:bg-white/10">Cancel</Button>
                <Button 
                    onClick={activeTab === 'course' ? handleCreateCourse : handlePostOffer} 
                    disabled={isPosting} 
                    className="bg-cyan-500 hover:bg-cyan-600 text-black"
                >
                    {isPosting ? <Loader2 className="animate-spin" size={18} /> : (activeTab === 'course' ? "Create Course" : "Post Offer")}
                </Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        )}
      </div>

      <Tabs defaultValue="offers" className="w-full" onValueChange={setActiveTab} value={activeTab}>
        <div className="px-4 py-2 border-b border-white/10">
          <TabsList className="w-full bg-white/5 p-1 grid grid-cols-3">
            <TabsTrigger value="offers" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <Briefcase size={16} className="mr-2" /> Active Offers
            </TabsTrigger>
            <TabsTrigger value="course" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <BookOpen size={16} className="mr-2" /> Course
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <MessageSquare size={16} className="mr-2" /> Messages
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="offers" className="p-4 space-y-4 mt-0">
          <AnimatePresence>
            {loading && activeTab === 'offers' ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-cyan-500" />
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Ghost size={48} className="mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-gray-300">No Active Offers</h3>
                <p className="text-sm max-w-xs mx-auto mt-2">Be the first to post an offer and start earning Vaulty Credits!</p>
              </div>
            ) : (
              offers.map((offer, index) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-zinc-900/50 border-white/10 overflow-hidden hover:border-cyan-500/30 transition-colors">
                    {offer.image && (
                      <div className="h-32 w-full overflow-hidden relative">
                        <img src={offer.image} alt={offer.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border border-white/10">
                            <AvatarImage src={offer.userAvatar} />
                            <AvatarFallback>{offer.username[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-white">{offer.username}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock size={10} /> {offer.createdAt?.toDate ? formatDistanceToNow(offer.createdAt.toDate()) : "Just now"} ago
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 flex items-center gap-1">
                           <VaultyIcon size={14} /> {offer.price.toLocaleString()}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg mt-2 text-white">{offer.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <p className="text-sm text-gray-400 line-clamp-3">{offer.description}</p>
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-between items-center border-t border-white/5 p-4 bg-white/2">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-500/10">
                          <AlertTriangle size={16} />
                        </Button>
                      </div>
                      <Button size="sm" onClick={() => handleContact(offer)} className="bg-white/10 hover:bg-white/20 text-white border border-white/10">
                        Contact Seller
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="course" className="p-4 space-y-4 mt-0">
          <AnimatePresence>
            {loading && activeTab === 'course' ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-cyan-500" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-gray-300">No Courses Available</h3>
                <p className="text-sm max-w-xs mx-auto mt-2">Create a course to share your knowledge!</p>
              </div>
            ) : (
              courses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setLocation(`/course/${course.id}`)}
                  className="cursor-pointer"
                >
                  <Card className="bg-zinc-900/50 border-white/10 overflow-hidden hover:border-cyan-500/30 transition-colors group">
                    <div className="h-40 w-full overflow-hidden relative">
                        {course.image ? (
                            <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                <BookOpen size={40} className="text-gray-600" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent opacity-80" />
                        <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                            <Badge className="bg-cyan-500/90 text-black hover:bg-cyan-500">
                                {course.duration}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs font-bold bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
                                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                {course.rating || "New"}
                            </div>
                        </div>
                    </div>

                    <CardHeader className="pb-2 pt-3">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 border border-white/10">
                            <AvatarImage src={course.userAvatar} />
                            <AvatarFallback>{course.username?.[0]}</AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-gray-400">{course.username}</p>
                        </div>
                      </div>
                      <CardTitle className="text-lg text-white leading-tight group-hover:text-cyan-400 transition-colors">{course.title}</CardTitle>
                    </CardHeader>
                    
                    <CardContent className="pb-3">
                        <p className="text-sm text-gray-400 line-clamp-2">{course.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <Users size={12} />
                                <span>{course.subscribers || 0} enrolled</span>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="pt-0 border-t border-white/5 p-3 bg-white/2 flex justify-between items-center">
                        <span className="text-sm font-bold text-white">${course.price} <span className="text-xs font-normal text-gray-500">/mo</span></span>
                        <Button size="sm" variant="ghost" className="h-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10">
                            View Details
                        </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="messages" className="p-0 mt-0">
          <ScrollArea className="h-[calc(100vh-140px)]">
            {chats.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                <p>No messages yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {chats.map((chat) => (
                  <div 
                    key={chat.id} 
                    className="p-4 flex items-center gap-4 hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/chat/private/${chat.withUserId}`)}
                  >
                    <Avatar className="h-12 w-12 border border-white/10">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.withUserId}`} />
                      <AvatarFallback>?</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="text-sm font-semibold text-white">User {chat.withUserId.slice(0,4)}</h3>
                        <span className="text-xs text-gray-500">
                          {chat.timestamp?.toDate ? formatDistanceToNow(chat.timestamp.toDate()) : ""} ago
                        </span>
                      </div>
                      <p className={`text-sm truncate ${chat.unread ? 'text-white font-medium' : 'text-gray-400'}`}>
                        {chat.lastMessage}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* TOS Agreement Modal */}
      <Dialog open={isTOSOpen} onOpenChange={setIsTOSOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle size={20} /> Important Notice
            </DialogTitle>
            <DialogDescription className="text-gray-300 pt-2">
              Before contacting this provider, you must review and agree to our Terms of Service.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-black/40 p-4 rounded-md border border-white/5 text-sm text-gray-400 my-2">
            <p>By proceeding, you agree to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Conduct all transactions safely.</li>
              <li>Respect the provider's time and rates.</li>
              <li>Adhere to the <span className="text-cyan-400 underline cursor-pointer" onClick={() => setLocation('/tos')}>Full Terms of Service</span>.</li>
            </ul>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button variant="ghost" onClick={() => setIsTOSOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleAgreeTOS} className="bg-cyan-500 hover:bg-cyan-600 text-black w-full sm:w-auto">
              I Agree, Continue to Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
