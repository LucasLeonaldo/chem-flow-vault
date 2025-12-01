-- Corrigir políticas RLS de user_roles para permitir que admins gerenciem roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

CREATE POLICY "Admins can manage all roles"
ON user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Adicionar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_product_movements_created_by ON product_movements(created_by);