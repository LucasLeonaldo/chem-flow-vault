import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "analyst" | "operator" | "viewer";

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) {
          console.error("Error fetching user role:", error);
          setRole("viewer"); // Default role
        } else if (!data || data.length === 0) {
          // No role assigned yet, use default
          setRole("viewer");
        } else {
          // User has one or more roles, get the highest privilege one
          const roleHierarchy: Record<UserRole, number> = {
            viewer: 1,
            operator: 2,
            analyst: 3,
            admin: 4,
          };
          
          const highestRole = data.reduce((highest, current) => {
            const currentRole = current.role as UserRole;
            return roleHierarchy[currentRole] > roleHierarchy[highest] 
              ? currentRole 
              : highest;
          }, "viewer" as UserRole);
          
          setRole(highestRole);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole("viewer");
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const hasPermission = (requiredRole: UserRole) => {
    if (!role) return false;
    
    const roleHierarchy: Record<UserRole, number> = {
      viewer: 1,
      operator: 2,
      analyst: 3,
      admin: 4,
    };

    return roleHierarchy[role] >= roleHierarchy[requiredRole];
  };

  return { role, loading, hasPermission };
};