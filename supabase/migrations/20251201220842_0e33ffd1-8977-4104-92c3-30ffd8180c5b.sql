-- Criar função para adicionar role admin ao primeiro usuário (bootstrap)
-- Esta função só pode ser usada por service_role ou quando não existe nenhum admin ainda
CREATE OR REPLACE FUNCTION public.bootstrap_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir role admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT DO NOTHING;
END;
$$;

-- Usar a função para criar os admins iniciais
SELECT public.bootstrap_admin('c7c3e286-216a-4d73-99ac-657d64bba204');
SELECT public.bootstrap_admin('925b5f7f-1a8d-4665-9754-1ef942cade65');