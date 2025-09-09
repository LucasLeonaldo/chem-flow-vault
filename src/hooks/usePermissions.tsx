import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export type PermissionAction = 
  | "view_products"
  | "create_products"
  | "edit_products"
  | "delete_products"
  | "view_invoices"
  | "create_invoices"
  | "edit_invoices"
  | "delete_invoices"
  | "view_movements"
  | "create_movements"
  | "edit_movements"
  | "delete_movements"
  | "view_suppliers"
  | "create_suppliers"
  | "edit_suppliers"
  | "delete_suppliers"
  | "view_locations"
  | "create_locations"
  | "edit_locations"
  | "delete_locations"
  | "manage_users"
  | "view_reports"
  | "approve_products";

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<PermissionAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        // Check if user is admin first (admin has all permissions)
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (roleData) {
          // If admin, grant all permissions
          const allPermissions: PermissionAction[] = [
            "view_products", "create_products", "edit_products", "delete_products",
            "view_invoices", "create_invoices", "edit_invoices", "delete_invoices",
            "view_movements", "create_movements", "edit_movements", "delete_movements",
            "view_suppliers", "create_suppliers", "edit_suppliers", "delete_suppliers",
            "view_locations", "create_locations", "edit_locations", "delete_locations",
            "manage_users", "view_reports", "approve_products"
          ];
          setPermissions(allPermissions);
        } else {
          // Fetch specific permissions
          const { data, error } = await supabase
            .from("user_permissions")
            .select("permission")
            .eq("user_id", user.id);

          if (error) {
            console.error("Error fetching permissions:", error);
            setPermissions([]);
          } else {
            setPermissions(data.map(p => p.permission as PermissionAction));
          }
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const hasPermission = (permission: PermissionAction) => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionsList: PermissionAction[]) => {
    return permissionsList.some(permission => permissions.includes(permission));
  };

  return { permissions, loading, hasPermission, hasAnyPermission };
};