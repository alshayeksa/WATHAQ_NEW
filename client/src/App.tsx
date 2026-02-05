import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import Landing from "@/pages/landing";
import AuthCallback from "@/pages/auth-callback";
import Dashboard from "@/pages/dashboard";
import DashboardTrashPage from "@/pages/dashboard-trash";
import ProjectDetail from "@/pages/project-detail";
import TrashPage from "@/pages/trash";
import PublicViewer from "@/pages/public-viewer";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import ProfileSettings from "@/pages/profile-settings";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/";
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/dashboard/trash">
        {() => <ProtectedRoute component={DashboardTrashPage} />}
      </Route>
      <Route path="/project/:id">
        {() => <ProtectedRoute component={ProjectDetail} />}
      </Route>
      <Route path="/project/:id/trash">
        {() => <ProtectedRoute component={TrashPage} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={ProfileSettings} />}
      </Route>
      <Route path="/s/:slug" component={PublicViewer} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
