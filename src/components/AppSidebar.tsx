import { useState } from "react";
import { 
  LayoutDashboard, 
  Package, 
  ArrowRightLeft, 
  FlaskConical, 
  Warehouse, 
  AlertTriangle,
  Users,
  Settings,
  ChevronRight,
  LogOut,
  FileText,
  BarChart3,
  Bell
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, permission: null },
  { title: "Produtos", url: "/produtos", icon: Package, permission: "view_products" },
  { title: "Notas Fiscais", url: "/notas-fiscais", icon: FileText, permission: "view_invoices" },
  { title: "Movimentações", url: "/movimentacoes", icon: ArrowRightLeft, permission: null },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, permission: "view_reports" },
  { title: "Laboratório", url: "/laboratorio", icon: FlaskConical, permission: "view_locations" },
  { title: "Almoxarifado", url: "/almoxarifado", icon: Warehouse, permission: "view_locations" },
  { title: "Alertas", url: "/alertas", icon: AlertTriangle, permission: "view_reports" },
];

const adminItems = [
  { title: "Notificações", url: "/notificacoes", icon: Bell, permission: null },
  { title: "Usuários", url: "/usuarios", icon: Users, permission: "manage_users" },
  { title: "Perfil", url: "/perfil", icon: Users, permission: null },
  { title: "Configurações", url: "/configuracoes", icon: Settings, permission: null },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { signOut } = useAuth();
  const { hasPermission } = usePermissions();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-accent text-sidebar-foreground";

  return (
    <Sidebar className={!open ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-8 w-8 text-primary" />
            {open && (
              <div>
                <h2 className="text-lg font-semibold text-sidebar-foreground">ChemStock</h2>
                <p className="text-xs text-sidebar-foreground/60">Gestão Química</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 font-medium">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems
                .filter((item) => !item.permission || hasPermission(item.permission as any))
                .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 font-medium">
            Administração
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems
                .filter((item) => !item.permission || hasPermission(item.permission as any))
                .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            onClick={() => signOut()}
            className="w-full justify-start text-sidebar-foreground hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
            {open && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}