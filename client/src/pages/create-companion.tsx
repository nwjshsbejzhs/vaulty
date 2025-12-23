import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { usePremium } from "@/contexts/premium-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Check, Lock, ChevronRight, User, Heart, GraduationCap, Brain, Zap, Camera, X, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Cropper from "react-easy-crop";

const NATIONALITIES = [
  "Slovenia", "Serbia", "America", "Croatia", "Germany", "France", "Italy", "Spain", "Russia", "China", 
  "Japan", "Korea", "Brazil", "Argentina", "Canada", "Australia", "United Kingdom", "India", "Turkey", 
  "Greece", "Sweden", "Norway", "Finland", "Denmark", "Netherlands", "Belgium", "Portugal", "Poland", 
  "Austria", "Switzerland"
];

const ROLES = [
  { id: "friend", name: "Friend", icon: User, description: "A chill companion to hang out with.", locked: false },
  { id: "lover", name: "Lover", icon: Heart, description: "Romantic and affectionate.", locked: false },
  { id: "mentor", name: "Mentor", icon: GraduationCap, description: "Guidance and wisdom.", locked: false },
  { id: "expert", name: "Expert", icon: Brain, description: "Deep knowledge in specific fields.", locked: true },
  { id: "motivator", name: "Motivator", icon: Zap, description: "High energy motivation.", locked: true }
];

export default function CreateCompanion() {
  const [, setLocation] = useLocation();
  const { tier, hasAccess } = usePremium();
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    nationality: "",
    avatar: "",
    role: ""
  });
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setTempImageSrc(dataUrl);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropConfirm = async () => {
    if (!tempImageSrc || !croppedAreaPixels) return;
    
    const canvas = document.createElement("canvas");
    const image = new Image();
    image.src = tempImageSrc;
    image.onload = () => {
      const ctx = canvas.getContext("2d");
      const pixels = croppedAreaPixels as any;
      canvas.width = pixels.width;
      canvas.height = pixels.height;
      if (ctx) {
        ctx.drawImage(
          image,
          pixels.x,
          pixels.y,
          pixels.width,
          pixels.height,
          0,
          0,
          pixels.width,
          pixels.height
        );
        const croppedImage = canvas.toDataURL("image/jpeg");
        setFormData({...formData, avatar: croppedImage});
        setShowCropper(false);
        toast.success("Image cropped and uploaded!");
      }
    };
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name || !formData.age || !formData.nationality) {
        toast.error("Please fill in all fields");
        return;
      }
      if (parseInt(formData.age) < 18) {
        toast.error("Companion must be at least 18 years old");
        return;
      }
    }
    if (step === 3 && !formData.role) {
      toast.error("Please select a role");
      return;
    }
    setStep(s => Math.min(s + 1, totalSteps));
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSave = () => {
    const newCompanion = {
      id: `comp_${Date.now()}`,
      ...formData,
      createdAt: new Date().toISOString(),
      type: "companion"
    };

    const existing = JSON.parse(localStorage.getItem("vaulty_companions") || "[]");
    
    const limit = tier === "free" ? 3 : tier === "pro" ? 10 : 9999;
    if (existing.length >= limit) {
      toast.error(`You have reached the limit of ${limit} companions for your plan.`);
      return;
    }

    localStorage.setItem("vaulty_companions", JSON.stringify([...existing, newCompanion]));
    toast.success("Companion created successfully!");
    setLocation("/messages");
  };

  const isRoleLocked = (roleId: string) => {
    const role = ROLES.find(r => r.id === roleId);
    if (!role?.locked) return false;
    return tier === "free" && role.locked;
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/messages")}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Create Companion</h1>
          <p className="text-zinc-400 text-sm">Step {step} of {totalSteps}</p>
        </div>
      </div>

      {/* Progress Bar with Gradient */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-zinc-400 mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #06B6D4 0%, #3B82F6 50%, #EC4899 100%)"
            }}
          />
        </div>
      </div>

      {/* Steps */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Alice"
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <Label>Age (18+)</Label>
                <Input 
                  type="number"
                  min="18"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  placeholder="18"
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Select 
                  value={formData.nationality} 
                  onValueChange={(val) => setFormData({...formData, nationality: val})}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 max-h-64">
                    {NATIONALITIES.map(nat => (
                      <SelectItem key={nat} value={nat} className="cursor-pointer">{nat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <Avatar className="w-32 h-32 border-4 border-blue-500 cursor-pointer transition-all group-hover:border-cyan-400 group-hover:shadow-lg group-hover:shadow-cyan-500/30">
                    <AvatarImage src={formData.avatar} className="object-cover" />
                    <AvatarFallback className="text-4xl bg-gradient-to-br from-blue-600 to-purple-600">{formData.name[0]}</AvatarFallback>
                  </Avatar>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-zinc-400">Click the circle above to upload a profile picture</p>
                <p className="text-xs text-zinc-500">(Optional)</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-4">Choose a Role</h2>
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-2">
                {ROLES.map((role) => {
                  const locked = isRoleLocked(role.id);
                  const selected = formData.role === role.id;
                  const Icon = role.icon;
                  
                  return (
                    <div
                      key={role.id}
                      onClick={() => !locked && setFormData({...formData, role: role.id})}
                      className={`
                        relative p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4
                        ${selected ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900/50'}
                        ${locked ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-700'}
                      `}
                    >
                      <div className={`p-2 rounded-lg ${selected ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Icon size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{role.name}</h3>
                          {locked && <Lock size={14} className="text-amber-500" />}
                        </div>
                        <p className="text-xs text-zinc-400">{role.description}</p>
                      </div>
                      {selected && <Check className="text-blue-500" />}
                    </div>
                  );
                })}
              </div>
              {tier === "free" && (
                <p className="text-xs text-amber-500 text-center mt-4">
                  Upgrade to PRO to unlock Expert and Motivator roles!
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 text-center">
              <h2 className="text-2xl font-bold">Meet {formData.name}!</h2>
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="w-40 h-40 border-4 border-blue-500 shadow-xl shadow-blue-500/20">
                    <AvatarImage src={formData.avatar} className="object-cover" />
                    <AvatarFallback className="text-5xl bg-gradient-to-br from-blue-600 to-purple-600">{formData.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-2 right-2 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-700 text-xs font-semibold capitalize flex items-center gap-1">
                    {ROLES.find(r => r.id === formData.role)?.icon && (() => {
                      const Icon = ROLES.find(r => r.id === formData.role)!.icon;
                      return <Icon size={12} />;
                    })()}
                    {ROLES.find(r => r.id === formData.role)?.name}
                  </div>
                </div>
              </div>
              
              <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/50 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs uppercase mb-1">Age</p>
                    <p className="font-mono text-lg">{formData.age}</p>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs uppercase mb-1">Nationality</p>
                    <p className="font-medium">{formData.nationality}</p>
                  </div>
                </div>
                
                <div className="pt-2">
                  <p className="text-sm text-zinc-400 italic">
                    "{formData.role === 'friend' ? "Hey there! Ready to hang out?" : 
                      formData.role === 'lover' ? "I've been waiting for you..." :
                      formData.role === 'mentor' ? "I am here to guide you." :
                      formData.role === 'expert' ? "Ask me anything." :
                      "Let's crush it today!"}"
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Image Cropper Modal */}
      <AnimatePresence>
        {showCropper && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex flex-col"
          >
            <div className="flex justify-between items-center p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold">Crop Image</h2>
              <button onClick={() => setShowCropper(false)} className="text-zinc-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 relative overflow-hidden">
              <Cropper
                image={tempImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="bg-black/80 backdrop-blur-md border-t border-zinc-800 p-4 space-y-4">
              <div className="flex items-center gap-4">
                <ZoomOut size={20} className="text-zinc-400" />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-zinc-800 rounded-full cursor-pointer"
                />
                <ZoomIn size={20} className="text-zinc-400" />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCropper(false);
                    setTempImageSrc("");
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropConfirm}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-lg border-t border-zinc-800 flex justify-between gap-4">
        {step > 1 && (
          <Button variant="outline" onClick={handleBack} className="flex-1 bg-transparent border-zinc-700 text-white hover:bg-zinc-800">
            Back
          </Button>
        )}
        {step < totalSteps ? (
          <Button onClick={handleNext} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
            Create Companion
          </Button>
        )}
      </div>
    </div>
  );
}
