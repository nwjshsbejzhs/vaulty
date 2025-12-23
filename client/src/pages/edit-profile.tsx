import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { ChevronLeft, Save, Loader2, Camera, Upload, AlertCircle, AtSign, MapPin, Globe, Twitter, Instagram, X, ZoomIn, ZoomOut } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { differenceInDays } from "date-fns";
import Cropper from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function EditProfile() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.displayName || "");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [uploading, setUploading] = useState(false);
  const [lastUsernameChange, setLastUsernameChange] = useState<Date | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
      setPhotoURL(user.photoURL || "");
      
      // Load current bio and username from Firestore
      const loadProfile = async () => {
        const docRef = doc(db, "users", user.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
             const data = docSnap.data();
             setBio(data.bio || "");
             setUsername(data.username || user.email?.split('@')[0] || "");
             setUserLocation(data.location || "");
             setWebsite(data.links?.website || "");
             setTwitter(data.links?.twitter || "");
             setInstagram(data.links?.instagram || "");
             
             if (data.lastUsernameChange) {
               setLastUsernameChange(data.lastUsernameChange.toDate());
             }
          }
        } catch (e) {
          console.error("Error loading profile:", e);
        }
      };
      loadProfile();
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!tempImageSrc || !croppedAreaPixels || !user) return;
    
    const canvas = document.createElement("canvas");
    const image = new Image();
    image.src = tempImageSrc;
    image.onload = async () => {
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
        canvas.toBlob(async (blob) => {
          if (blob) {
            setUploading(true);
            try {
              const storageRef = ref(storage, `profile_photos/${user.uid}`);
              await uploadBytes(storageRef, blob);
              const url = await getDownloadURL(storageRef);
              setPhotoURL(url);
              toast.success("Photo updated!");
            } catch (error) {
              console.error("Error uploading photo:", error);
              toast.error("Failed to upload photo");
            } finally {
              setUploading(false);
              setShowCropper(false);
            }
          }
        }, "image/jpeg");
      }
    };
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Check username constraints
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      const currentUsername = docSnap.exists() ? docSnap.data().username : "";
      
      let updateData: any = {
        displayName: name,
        photoURL: photoURL,
        bio: bio,
        location: userLocation,
        links: {
            website,
            twitter,
            instagram
        }
      };

      if (username !== currentUsername) {
        if (lastUsernameChange && differenceInDays(new Date(), lastUsernameChange) < 30) {
          alert("You can only change your username once every 30 days.");
          setLoading(false);
          return;
        }
        updateData.username = username;
        updateData.lastUsernameChange = new Date();
      }

      // Update Firebase Auth Profile
      await updateProfile(user, {
        displayName: name,
        photoURL: photoURL
      });

      // Update Firestore User Document
      await updateDoc(docRef, updateData);

      setLocation("/profile");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const daysRemaining = lastUsernameChange ? 30 - differenceInDays(new Date(), lastUsernameChange) : 0;
  const canChangeUsername = !lastUsernameChange || daysRemaining <= 0;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <button onClick={() => setLocation("/profile")} className="p-2 hover:bg-white/10 rounded-full">
             <ChevronLeft size={24} />
           </button>
           <h1 className="font-bold text-lg">Edit Profile</h1>
        </div>
        <button 
          onClick={handleSave} 
          disabled={loading || uploading}
          className="px-4 py-2 bg-white text-black font-bold rounded-full disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Save
        </button>
      </div>

      <div className="p-6 max-w-md mx-auto space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-white/10 overflow-hidden bg-gray-800">
              <img src={photoURL || "https://github.com/shadcn.png"} className="w-full h-full object-cover" alt="Profile" />
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" />
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-cyan-500 rounded-full cursor-pointer hover:bg-cyan-400 transition-colors shadow-lg">
              <Camera size={20} className="text-black" />
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          <p className="text-gray-400 text-sm">Tap camera icon to change photo</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-400 ml-1">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-400 ml-1 flex justify-between">
              <span>Username</span>
              {!canChangeUsername && (
                <span className="text-red-400 text-xs font-normal">Available in {daysRemaining} days</span>
              )}
            </label>
            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!canChangeUsername}
                className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-colors ${!canChangeUsername ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-400 ml-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors h-32 resize-none"
              placeholder="Tell us about yourself..."
              maxLength={160}
            />
            <p className="text-right text-xs text-gray-500">{bio.length}/160</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-400 ml-1">Location</label>
            <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                type="text"
                value={userLocation}
                onChange={(e) => setUserLocation(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="City, Country"
                />
            </div>
          </div>

          <div className="space-y-3 pt-2">
             <label className="text-sm font-bold text-gray-400 ml-1">Social Links</label>
             
             <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Website URL"
                />
            </div>

            <div className="relative">
                <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Twitter / X Profile URL"
                />
            </div>

            <div className="relative">
                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Instagram Profile URL"
                />
            </div>
          </div>
        </div>
      </div>

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
              <h2 className="text-lg font-semibold">Crop Photo</h2>
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
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm text-white"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
