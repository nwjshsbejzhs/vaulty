import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black text-white">
      <Card className="w-full max-w-md mx-4 bg-white/5 border-white/10 text-white">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-400">
            The page you are looking for does not exist.
          </p>
          
          <div className="mt-6">
            <Link href="/">
              <button className="w-full py-2 rounded-lg bg-white text-black font-bold hover:bg-gray-200 transition-colors">
                Return Home
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
