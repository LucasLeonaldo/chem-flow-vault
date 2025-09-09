import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { type PermissionAction } from "@/hooks/usePermissions";

interface PermissionsManagerProps {
  userId: string;
  userName: string;
  onPermissionsChange?: () => void;
}

const PERMISSION_GROUPS = {
  "Produtos": [
    { key: "view_products" as PermissionAction, label: "Visualizar produtos" },
    { key: "create_products" as PermissionAction, label: "Criar produtos" },
    { key: "edit_products" as PermissionAction, label: "Editar produtos" },
    { key: "delete_products" as PermissionAction, label: "Excluir produtos" },
    { key: "approve_products" as PermissionAction, label: "Aprovar produtos" },
  ],
  "Notas Fiscais": [
    { key: "view_invoices" as PermissionAction, label: "Visualizar notas fiscais" },
    { key: "create_invoices" as PermissionAction, label: "Criar notas fiscais" },
    { key: "edit_invoices" as PermissionAction, label: "Editar notas fiscais" },
    { key: "delete_invoices" as PermissionAction, label: "Excluir notas fiscais" },
  ],
  "Movimentações": [
    { key: "view_movements" as PermissionAction, label: "Visualizar movimentações" },
    { key: "create_movements" as PermissionAction, label: "Criar movimentações" },
    { key: "edit_movements" as PermissionAction, label: "Editar movimentações" },
    { key: "delete_movements" as PermissionAction, label: "Excluir movimentações" },
  ],
  "Fornecedores": [
    { key: "view_suppliers" as PermissionAction, label: "Visualizar fornecedores" },
    { key: "create_suppliers" as PermissionAction, label: "Criar fornecedores" },
    { key: "edit_suppliers" as PermissionAction, label: "Editar fornecedores" },
    { key: "delete_suppliers" as PermissionAction, label: "Excluir fornecedores" },
  ],
  "Localizações": [
    { key: "view_locations" as PermissionAction, label: "Visualizar localizações" },
    { key: "create_locations" as PermissionAction, label: "Criar localizações" },
    { key: "edit_locations" as PermissionAction, label: "Editar localizações" },
    { key: "delete_locations" as PermissionAction, label: "Excluir localizações" },
  ],
  "Sistema": [
    { key: "manage_users" as PermissionAction, label: "Gerenciar usuários" },
    { key: "view_reports" as PermissionAction, label: "Visualizar relatórios" },
  ],
} as const;

export function PermissionsManager({ userId, userName, onPermissionsChange }: PermissionsManagerProps) {
  const [userPermissions, setUserPermissions] = useState<PermissionAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserPermissions();
  }, [userId]);

  const fetchUserPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("permission")
        .eq("user_id", userId);

      if (error) throw error;

      setUserPermissions(data.map(p => p.permission as PermissionAction));
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões do usuário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = async (permission: PermissionAction, checked: boolean) => {
    setSaving(true);
    
    try {
      if (checked) {
        // Add permission
        const { error } = await supabase
          .from("user_permissions")
          .insert({
            user_id: userId,
            permission: permission
          });

        if (error) throw error;

        setUserPermissions(prev => [...prev, permission]);
        const permissionLabel = Object.values(PERMISSION_GROUPS)
          .flat()
          .find(p => p.key === permission)?.label || permission;
          
        toast({
          title: "Permissão concedida",
          description: `Permissão "${permissionLabel}" foi concedida.`,
        });
      } else {
        // Remove permission
        const { error } = await supabase
          .from("user_permissions")
          .delete()
          .eq("user_id", userId)
          .eq("permission", permission);

        if (error) throw error;

        setUserPermissions(prev => prev.filter(p => p !== permission));
        toast({
          title: "Permissão removida",
          description: `Permissão foi removida com sucesso.`,
        });
      }

      onPermissionsChange?.();
    } catch (error) {
      console.error("Error updating permission:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a permissão",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Permissões de {userName}</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie as permissões específicas para este usuário
          </p>
        </div>
        <Badge variant="outline">
          {userPermissions.length} permissões ativas
        </Badge>
      </div>

      <div className="grid gap-6">
        {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
          <Card key={groupName}>
            <CardHeader>
              <CardTitle className="text-base">{groupName}</CardTitle>
              <CardDescription>
                Permissões relacionadas a {groupName.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {permissions.map((permission) => (
                <div key={permission.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={permission.key}
                    checked={userPermissions.includes(permission.key)}
                    onCheckedChange={(checked) => 
                      handlePermissionToggle(permission.key, checked as boolean)
                    }
                    disabled={saving}
                  />
                  <Label 
                    htmlFor={permission.key}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {permission.label}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}