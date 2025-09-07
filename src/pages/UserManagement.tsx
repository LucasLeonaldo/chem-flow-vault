import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Shield, Settings, Search, MoreHorizontal, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  roles: string[];
}

function UserManagement() {
  const { user } = useAuth();
  const { hasPermission } = useUserRole();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  // New user invitation state
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("viewer");
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (hasPermission("admin")) {
      fetchUsers();
    }
  }, [hasPermission]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        roles: userRoles?.filter(ur => ur.user_id === profile.id).map(ur => ur.role) || []
      })) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: string, action: "add" | "remove") => {
    try {
      if (action === "add") {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole as "admin" | "analyst" | "operator" | "viewer" });

        if (error) throw error;

        toast({
          title: "Permissão adicionada",
          description: `Permissão ${newRole} adicionada com sucesso.`,
        });
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", newRole as "admin" | "analyst" | "operator" | "viewer");

        if (error) throw error;

        toast({
          title: "Permissão removida",
          description: `Permissão ${newRole} removida com sucesso.`,
        });
      }

      await fetchUsers();
    } catch (error) {
      console.error("Error changing user role:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar as permissões do usuário",
        variant: "destructive",
      });
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);

    try {
      // In a real app, you would send an invitation email
      // For now, we'll just show instructions to the admin
      toast({
        title: "Instruções de convite",
        description: `Para adicionar o usuário ${inviteEmail}, eles devem se registrar no sistema usando este email. Após o registro, você pode alterar suas permissões aqui.`,
      });

      setInviteEmail("");
      setInviteRole("viewer");
      setInviteDialog(false);
    } catch (error) {
      console.error("Error inviting user:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o convite",
        variant: "destructive",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "all" || user.roles.includes(selectedRole);
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "analyst": return "default";
      case "operator": return "secondary";
      default: return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Administrador";
      case "analyst": return "Analista";
      case "operator": return "Operador";
      default: return "Visualizador";
    }
  };

  if (!hasPermission("admin")) {
    return (
      <div className="space-y-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar o gerenciamento de usuários.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
        </div>
        
        <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Convidar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar Novo Usuário</DialogTitle>
              <DialogDescription>
                O usuário receberá instruções para se registrar no sistema.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email do Usuário</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Permissão Inicial</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                    <SelectItem value="operator">Operador</SelectItem>
                    <SelectItem value="analyst">Analista</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setInviteDialog(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={inviteLoading} className="flex-1">
                  {inviteLoading ? "Enviando..." : "Enviar Convite"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtre os usuários por nome, email ou permissão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buscar por nome ou email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Filtrar por permissão</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as permissões</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="analyst">Analista</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{user.full_name || "Nome não informado"}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex gap-1 mt-2">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <Badge key={role} variant={getRoleBadgeVariant(role)}>
                            {getRoleLabel(role)}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline">Sem permissões</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(role) => handleChangeUserRole(user.id, role, "add")}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Adicionar permissão" />
                    </SelectTrigger>
                    <SelectContent>
                      {!user.roles.includes("viewer") && (
                        <SelectItem value="viewer">Visualizador</SelectItem>
                      )}
                      {!user.roles.includes("operator") && (
                        <SelectItem value="operator">Operador</SelectItem>
                      )}
                      {!user.roles.includes("analyst") && (
                        <SelectItem value="analyst">Analista</SelectItem>
                      )}
                      {!user.roles.includes("admin") && (
                        <SelectItem value="admin">Administrador</SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {user.roles.length > 0 && (
                    <Select
                      onValueChange={(role) => handleChangeUserRole(user.id, role, "remove")}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Remover permissão" />
                      </SelectTrigger>
                      <SelectContent>
                        {user.roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {getRoleLabel(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhum usuário encontrado
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Não foram encontrados usuários que correspondam aos filtros selecionados.
            </p>
          </CardContent>
        </Card>
      )}

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Instruções para criar usuário admin:</strong><br />
          1. Vá para a página de login (/auth)<br />
          2. Registre-se com o email: admin@chemstock.com<br />
          3. Use uma senha segura<br />
          4. Após o registro, volte aqui para gerenciar permissões
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default UserManagement;