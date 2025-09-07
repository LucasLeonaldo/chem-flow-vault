import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AppSidebar } from "@/components/AppSidebar";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Alertas from "./pages/Alertas";
import Laboratorio from "./pages/Laboratorio";
import Almoxarifado from "./pages/Almoxarifado";
import Movimentacoes from "./pages/Movimentacoes";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card flex items-center px-6">
            <SidebarTrigger />
            <div className="ml-4">
              <h2 className="text-xl font-semibold text-foreground">ChemStock</h2>
              <p className="text-sm text-muted-foreground">Sistema de Gestão de Estoque Químico</p>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/produtos" 
              element={
                <ProtectedRoute>
                  <Products />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/alertas" 
              element={
                <ProtectedRoute>
                  <Alertas />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/laboratorio" 
              element={
                <ProtectedRoute>
                  <Laboratorio />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/almoxarifado" 
              element={
                <ProtectedRoute>
                  <Almoxarifado />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/movimentacoes" 
              element={
                <ProtectedRoute>
                  <Movimentacoes />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/usuarios" 
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/perfil" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/configuracoes" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;