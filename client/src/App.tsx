import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Registration from "@/pages/registration";
import WebinarRoom from "@/pages/webinar-room";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminWebinarDetail from "@/pages/admin-webinar-detail";
import AdminControl from "@/pages/admin-control";
import EmbedRegister from "@/pages/embed-register";
import EmbedWebinar from "@/pages/embed-webinar";

function Router() {
  return (
    <Switch>
      {/* Embed Routes (minimal UI for iframe) */}
      <Route path="/embed/register/:id" component={EmbedRegister} />
      <Route path="/embed/webinar/:id" component={EmbedWebinar} />
      
      {/* Public Routes */}
      <Route path="/register/:id" component={Registration} />
      <Route path="/webinar/:id" component={WebinarRoom} />
      
      {/* Admin Routes */}
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/webinar/:id" component={AdminWebinarDetail} />
      <Route path="/admin/webinar/:id/control" component={AdminControl} />
      
      {/* Home redirects to admin */}
      <Route path="/">
        {() => {
          window.location.href = "/admin";
          return null;
        }}
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
