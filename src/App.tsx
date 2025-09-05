import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/produtos" element={<Products />} />
                  <Route path="/movimentacoes" element={<Dashboard />} />
                  <Route path="/laboratorio" element={<Dashboard />} />
                  <Route path="/almoxarifado" element={<Dashboard />} />
                  <Route path="/alertas" element={<Dashboard />} />
                  <Route path="/usuarios" element={<Dashboard />} />
                  <Route path="/configuracoes" element={<Dashboard />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;