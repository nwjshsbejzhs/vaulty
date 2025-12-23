import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Ai from "@/pages/ai";
import Premium from "@/pages/premium";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Posts from "@/pages/posts";
import PostDetail from "@/pages/post-detail";
import Profile from "@/pages/profile";
import PublicProfile from "@/pages/public-profile";
import Chat from "@/pages/chat";
import RecentChats from "@/pages/recent-chats";
import Search from "@/pages/search";
import EditProfile from "@/pages/edit-profile";
import Settings from "@/pages/settings";
import Shop from "@/pages/shop";
import CoinDetail from "@/pages/coin-detail";
import DemoTrading from "@/pages/demo-trading";
import DemoCoinDetail from "@/pages/demo-coin-detail";
import FollowList from "@/pages/follow-list";
import Support from "@/pages/support"; 
import Quests from "@/pages/quests"; 
import Academy from "@/pages/academy"; 
import Article from "@/pages/article"; 
import Notifications from "@/pages/notifications"; 
import CardCustomization from "@/pages/card-customization";
import WalletPage from "@/pages/wallet";
import WalletSettingsPage from "@/pages/wallet-settings";
import Discover from "@/pages/discover";
import CreateCompanion from "@/pages/create-companion";
import CompanionChat from "@/pages/companion-chat";

import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { CurrencyProvider } from "@/contexts/currency-context";
import { PremiumProvider } from "@/contexts/premium-context";
import { GlobalNotificationProvider } from "@/contexts/global-notification-context";
import { BottomNav } from "@/components/bottom-nav";

import { LoadingScreen } from "@/components/loading-screen";
import { GlobalNotificationDisplay } from "@/components/global-notification-display";
import { useState, useEffect } from "react";
import { AdminMenu } from "@/components/admin/admin-menu";
import { HeadsUpNotification } from "@/components/heads-up-notification";

import EarnPage from "@/pages/earn";
import CourseDetail from "@/pages/course-detail";
import TOSPage from "@/pages/tos";
import PrivateChat from "@/pages/private-chat";
import MessageRequests from "@/pages/message-requests";

// Protected Route Component
function ProtectedRoute({ component: Component, hideNav = false }: { component: React.ComponentType, hideNav?: boolean }) {
  const { user, loading } = useAuth();
  
  if (loading) return null; 
  if (!user) return <Redirect to="/login" />;
  
  return <Component />;
}

function Router() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/" component={() => <Redirect to="/home" />} />
        
        {/* Home is now just Feed, no tabs param needed, but we keep /home for compatibility */}
        <Route path="/home" component={() => <ProtectedRoute component={Home} />} />
        {/* Support old route but redirect to home */}
        <Route path="/home/:tab" component={() => <Redirect to="/home" />} />
        
        <Route path="/discover" component={() => <ProtectedRoute component={Discover} />} />
        
        <Route path="/earn" component={() => <ProtectedRoute component={EarnPage} />} />
        <Route path="/course/:id" component={() => <ProtectedRoute component={CourseDetail} hideNav={true} />} />
        <Route path="/tos" component={() => <ProtectedRoute component={TOSPage} hideNav={true} />} />
        <Route path="/chat/private/:userId" component={() => <ProtectedRoute component={PrivateChat} hideNav={true} />} />

        {/* Hide Nav for AI page as requested */}
        <Route path="/ai" component={() => <ProtectedRoute component={Ai} hideNav={true} />} />
        
        <Route path="/premium" component={() => <ProtectedRoute component={Premium} />} />
        <Route path="/posts" component={() => <ProtectedRoute component={Posts} />} />
        <Route path="/post/:id" component={() => <ProtectedRoute component={PostDetail} />} />
        <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
        <Route path="/user/:id" component={() => <ProtectedRoute component={PublicProfile} />} />
        
        {/* Updated Messages Routes */}
        <Route path="/messages" component={() => <ProtectedRoute component={RecentChats} hideNav={true} />} />
        <Route path="/messages/companion/:id" component={() => <ProtectedRoute component={CompanionChat} hideNav={true} />} />
        <Route path="/messages/:id" component={() => <ProtectedRoute component={Chat} hideNav={true} />} />
        <Route path="/message-requests" component={() => <ProtectedRoute component={MessageRequests} hideNav={true} />} />
        <Route path="/create-companion" component={() => <ProtectedRoute component={CreateCompanion} hideNav={true} />} />

        <Route path="/users/:id/:type" component={() => <ProtectedRoute component={FollowList} />} />
        <Route path="/search" component={() => <ProtectedRoute component={Search} />} />
        <Route path="/edit-profile" component={() => <ProtectedRoute component={EditProfile} />} />
        <Route path="/customization" component={() => <ProtectedRoute component={CardCustomization} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
        <Route path="/shop" component={() => <ProtectedRoute component={Shop} />} />
        <Route path="/coin/:id" component={() => <ProtectedRoute component={CoinDetail} hideNav={true} />} />
        <Route path="/demo-trading" component={() => <ProtectedRoute component={DemoTrading} />} />
        <Route path="/demo-trading/:id" component={() => <ProtectedRoute component={DemoCoinDetail} />} />
        <Route path="/support" component={() => <ProtectedRoute component={Support} />} />
        <Route path="/quests" component={() => <ProtectedRoute component={Quests} />} />
        <Route path="/academy" component={() => <ProtectedRoute component={Academy} />} /> 
        <Route path="/academy/:slug" component={() => <ProtectedRoute component={Article} />} /> 
        <Route path="/notifications" component={() => <ProtectedRoute component={Notifications} />} /> 
        <Route path="/wallet" component={() => <ProtectedRoute component={WalletPage} hideNav={true} />} />
        <Route path="/wallet/settings" component={() => <ProtectedRoute component={WalletSettingsPage} hideNav={true} />} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Protect all images from being saved/downloaded
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('dragstart', handleDragStart, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('dragstart', handleDragStart, true);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PremiumProvider>
          <CurrencyProvider>
            <NotificationProvider>
              <GlobalNotificationProvider>
                <TooltipProvider>
                  {showSplash && (
                    <LoadingScreen onComplete={() => setShowSplash(false)} />
                  )}
                  {!showSplash && (
                    <>
                      <GlobalNotificationDisplay />
                      <HeadsUpNotification />
                      <AdminMenu />
                      <Router />
                      <BottomNav />
                      <Toaster />
                    </>
                  )}
                </TooltipProvider>
              </GlobalNotificationProvider>
            </NotificationProvider>
          </CurrencyProvider>
        </PremiumProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
