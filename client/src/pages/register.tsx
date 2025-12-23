import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation, Link } from "wouter";
import { Mail, Lock, Loader2, ArrowRight, User, Tag } from "lucide-react";
import vaultyLogo from "@/assets/vaulty_logo_christmas.png";

export default function Register() {
  const { register, signInWithGoogle } = useAuth();
  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    setError("");
    try {
      await register(email, password, name);
      setLocation("/home/overview");
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("Email is already registered. Please login.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else {
        setError("Failed to create account. Please try again.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      setLocation("/home/overview");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-900/20 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="w-32 h-32 mx-auto mb-6 relative">
             <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl animate-pulse" />
             <img src={vaultyLogo} alt="Vaulty Logo" className="w-full h-full object-contain relative z-10" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Create Account</h1>
          <p className="text-gray-400">Start building your wealth with Vaulty</p>
        </div>

        <div className="space-y-4 pt-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 px-6 bg-white text-black font-bold rounded-full flex items-center justify-center gap-3 hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
                <span>Sign up with Google</span>
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all absolute right-6" />
              </>
            )}
          </button>
          
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black px-2 text-gray-500">Or register with email</span>
            </div>
          </div>

          <div className="space-y-3">
             <div className="relative">
               <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
               <input 
                 type="text" 
                 placeholder="Full Name" 
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="w-full bg-black border border-gray-600 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-gray-500 transition-all backdrop-blur-sm"
               />
             </div>
             <div className="relative">
               <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
               <input 
                 type="email" 
                 placeholder="Email address" 
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full bg-black border border-gray-600 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-gray-500 transition-all backdrop-blur-sm"
               />
             </div>
             <div className="relative">
               <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
               <input 
                 type="password" 
                 placeholder="Password" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full bg-black border border-gray-600 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-gray-500 transition-all backdrop-blur-sm"
               />
             </div>
             <div className="relative">
               <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
               <input 
                 type="text" 
                 placeholder="Promo Code (Optional)" 
                 value={promoCode}
                 onChange={(e) => setPromoCode(e.target.value)}
                 className="w-full bg-black border border-gray-600 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-gray-500 transition-all backdrop-blur-sm"
               />
             </div>

             <button 
               onClick={handleRegister}
               disabled={loading}
               className="w-full py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
             >
               {loading ? <Loader2 className="animate-spin" /> : "Create Account"}
             </button>
          </div>
        </div>
        
        {error && (
          <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</p>
        )}

        <div className="space-y-4 text-center">
          <p className="text-gray-500 text-xs">
            By clicking on Create Account, you agree with our <span className="text-white font-semibold">Terms of Service</span>
          </p>
          <p className="text-center text-gray-500 text-sm">
            Already have an account? <Link href="/login" className="text-white font-bold cursor-pointer hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
