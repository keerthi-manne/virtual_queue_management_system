import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Auth
const RoleBasedAuth = lazy(() => import("./pages/auth/RoleBasedAuth"));

// Citizen Pages
const CitizenDashboard = lazy(() => import("./pages/citizen/CitizenDashboard"));
const TokenStatus = lazy(() => import("./pages/queue/TokenStatus"));

// Staff Pages
const StaffDashboard = lazy(() => import("./pages/staff/StaffDashboard"));

// Admin Pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

// Other
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Auth */}
                <Route path="/" element={<Navigate to="/auth" replace />} />
                <Route path="/auth" element={<RoleBasedAuth />} />

                {/* Citizen Routes */}
                <Route 
                  path="/citizen" 
                  element={
                    <ProtectedRoute requiredRole="USER">
                      <CitizenDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/citizen/status/:tokenId" 
                  element={
                    <ProtectedRoute requiredRole="USER">
                      <TokenStatus />
                    </ProtectedRoute>
                  } 
                />

                {/* Staff Routes */}
                <Route 
                  path="/staff" 
                  element={
                    <ProtectedRoute requiredRole="STAFF">
                      <StaffDashboard />
                    </ProtectedRoute>
                  } 
                />

                {/* Admin Routes */}
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />

                {/* Fallback */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
