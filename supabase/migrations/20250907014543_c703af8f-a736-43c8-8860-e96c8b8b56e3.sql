-- Criar um usuário admin de teste
-- Primeiro, vamos inserir diretamente na tabela profiles e user_roles

-- Inserir um perfil admin de teste
INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Admin Sistema',
  'admin@chemstock.com',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  updated_at = EXCLUDED.updated_at;

-- Inserir role de admin para o usuário de teste
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin'::app_role,
  now()
) ON CONFLICT (user_id, role) DO NOTHING;

-- Adicionar alguns fornecedores de exemplo se não existirem
INSERT INTO public.suppliers (name, contact_email, contact_phone, address, created_at, updated_at)
VALUES 
  ('Sigma-Aldrich', 'contato@sigma-aldrich.com', '+55 11 1234-5678', 'São Paulo, SP', now(), now()),
  ('Merck KGaA', 'contato@merck.com.br', '+55 11 2345-6789', 'Rio de Janeiro, RJ', now(), now()),
  ('Fisher Scientific', 'contato@fisher.com.br', '+55 11 3456-7890', 'Belo Horizonte, MG', now(), now())
ON CONFLICT (name) DO NOTHING;

-- Adicionar localizações de exemplo se não existirem
INSERT INTO public.locations (name, type, description, created_at)
VALUES 
  ('Laboratório Central', 'laboratory', 'Laboratório principal para análises químicas', now()),
  ('Laboratório de Pesquisa', 'laboratory', 'Laboratório dedicado a pesquisa e desenvolvimento', now()),
  ('Almoxarifado Principal', 'warehouse', 'Estoque principal de produtos químicos', now()),
  ('Almoxarifado Secundário', 'warehouse', 'Estoque auxiliar para produtos de uso frequente', now())
ON CONFLICT (name) DO NOTHING;