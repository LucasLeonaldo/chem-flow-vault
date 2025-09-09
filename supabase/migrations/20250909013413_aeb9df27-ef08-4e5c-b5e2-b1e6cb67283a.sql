-- Create permissions system
CREATE TYPE public.permission_action AS ENUM (
  'view_products',
  'create_products',
  'edit_products',
  'delete_products',
  'view_invoices',
  'create_invoices',
  'edit_invoices',
  'delete_invoices',
  'view_movements',
  'create_movements',
  'edit_movements',
  'delete_movements',
  'view_suppliers',
  'create_suppliers',
  'edit_suppliers',
  'delete_suppliers',
  'view_locations',
  'create_locations',
  'edit_locations',
  'delete_locations',
  'manage_users',
  'view_reports',
  'approve_products'
);

-- Create user permissions table
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  permission permission_action NOT NULL,
  granted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_permissions
CREATE POLICY "Admins can manage all permissions" 
ON public.user_permissions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own permissions" 
ON public.user_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission permission_action)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions
    WHERE user_id = _user_id
      AND permission = _permission
  ) OR has_role(_user_id, 'admin');
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default permissions for existing admin users
INSERT INTO public.user_permissions (user_id, permission, granted_by)
SELECT 
  ur.user_id,
  p.permission,
  ur.user_id
FROM public.user_roles ur
CROSS JOIN (
  SELECT unnest(ARRAY[
    'view_products'::permission_action,
    'create_products'::permission_action,
    'edit_products'::permission_action,
    'delete_products'::permission_action,
    'view_invoices'::permission_action,
    'create_invoices'::permission_action,
    'edit_invoices'::permission_action,
    'delete_invoices'::permission_action,
    'view_movements'::permission_action,
    'create_movements'::permission_action,
    'edit_movements'::permission_action,
    'delete_movements'::permission_action,
    'view_suppliers'::permission_action,
    'create_suppliers'::permission_action,
    'edit_suppliers'::permission_action,
    'delete_suppliers'::permission_action,
    'view_locations'::permission_action,
    'create_locations'::permission_action,
    'edit_locations'::permission_action,
    'delete_locations'::permission_action,
    'manage_users'::permission_action,
    'view_reports'::permission_action,
    'approve_products'::permission_action
  ]) as permission
) p
WHERE ur.role = 'admin'
ON CONFLICT (user_id, permission) DO NOTHING;