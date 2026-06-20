import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HeaderBar from "@/components/HeaderBar";
import HomePage from "@/pages/HomePage";
import NotFound from "@/pages/not-found";
import { queryClient } from "@/lib/queryClient";
import { getProfile } from "@/lib/profile";
import { fetchCurrentSession } from "@/lib/auth";

const SimulationPage   = lazy(() => import("@/pages/SimulationPage"));
const CityPage         = lazy(() => import("@/pages/CityPage"));
const ReplitopolisPage = lazy(() => import("@/pages/ReplitopolisPage"));
const ProfileSetupPage = lazy(() => import("@/pages/ProfileSetupPage"));
const LoginPage        = lazy(() => import("@/pages/LoginPage"));
const UserProfilePage  = lazy(() => import("@/pages/UserProfilePage"));
const FeedPage         = lazy(() => import("@/pages/FeedPage"));
const VideosPage       = lazy(() => import("@/pages/VideosPage"));
const TalksPage        = lazy(() => import("@/pages/TalksPage"));
const AdminPage        = lazy(() => import("@/pages/AdminPage"));
const DarioPage        = lazy(() => import("@/pages/DarioPage"));
const ParentDashboard  = lazy(() => import("@/pages/ParentDashboard"));
const ShareProfilePage = lazy(() => import("@/pages/ShareProfilePage"));
const UpgradePage      = lazy(() => import("@/pages/UpgradePage"));

const FULLSCREEN_ROUTES = new Set([
  "/", "/city", "/replitopolis", "/profile-setup", "/login",
  "/my-profile", "/feed", "/videos", "/talks", "/admin", "/dario", "/parent", "/upgrade",
]);
const FULLSCREEN_PREFIXES = ["/share/"];

function PageLoader() {
  return (
    <div className="h-screen flex items-center justify-center" style={{ background: "#0a1428" }}>
      <div className="text-center">
        <div className="text-3xl mb-3 animate-pulse">🌐</div>
        <div className="text-sm text-slate-400">Loading…</div>
      </div>
    </div>
  );
}

function useHeartbeat() {
  useEffect(() => {
    function ping() {
      const profile = getProfile();
      const learnerId = profile?.learnerId;
      if (!learnerId) return;
      void fetch("/api/safety/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: learnerId }),
      }).catch(() => {});
    }
    ping();
    const id = setInterval(ping, 60_000);
    return () => clearInterval(id);
  }, []);
}

function Router() {
  const [location] = useLocation();
  const isFullscreen = FULLSCREEN_ROUTES.has(location) || FULLSCREEN_PREFIXES.some(p => location.startsWith(p));
  useHeartbeat();

  useEffect(() => {
    fetchCurrentSession().catch(() => {});
  }, []);

  return (
    <>
      {!isFullscreen && <HeaderBar />}
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/city" component={CityPage} />
          <Route path="/replitopolis" component={ReplitopolisPage} />
          <Route path="/profile-setup" component={ProfileSetupPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/my-profile" component={UserProfilePage} />
          <Route path="/feed" component={FeedPage} />
          <Route path="/videos" component={VideosPage} />
          <Route path="/talks" component={TalksPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/dario" component={DarioPage} />
          <Route path="/parent" component={ParentDashboard} />
          <Route path="/share/:learnerId" component={ShareProfilePage} />
          <Route path="/upgrade" component={UpgradePage} />
          <Route path="/sim/:slug" component={SimulationPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="min-h-screen text-white">
            <Router />
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
