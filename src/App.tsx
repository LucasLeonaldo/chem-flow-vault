import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { usePermissions, PermissionAction } from "@/hooks/usePermissions";
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
import NotasFiscais from "./pages/NotasFiscais";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component with Permissions
function ProtectedRoute({ children, permission }: { children: React.ReactNode; permission?: PermissionAction }) {
  const { user, loading } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  
  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
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
                <ProtectedRoute permission="view_products">
                  <Products />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/notas-fiscais" 
              element={
                <ProtectedRoute permission="view_invoices">
                  <NotasFiscais />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/alertas" 
              element={
                <ProtectedRoute permission="view_reports">
                  <Alertas />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/laboratorio" 
              element={
                <ProtectedRoute permission="view_locations">
                  <Laboratorio />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/almoxarifado" 
              element={
                <ProtectedRoute permission="view_locations">
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
                <ProtectedRoute permission="manage_users">
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