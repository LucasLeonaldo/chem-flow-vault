-- Create invoices table for managing fiscal notes
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL UNIQUE,
  supplier_id uuid REFERENCES public.suppliers(id),
  issue_date date NOT NULL,
  receipt_date date,
  total_value numeric(10,2),
  status text DEFAULT 'received' CHECK (status IN ('received', 'processed', 'cancelled')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create invoice_items table for products in each fiscal note
CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  product_code text,
  quantity numeric NOT NULL,
  unit_price numeric(10,2),
  total_price numeric(10,2),
  batch text,
  manufacturing_date date,
  expiry_date date,
  unit text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Authenticated users can view invoices" 
ON public.invoices 
FOR SELECT 
USING (true);

CREATE POLICY "Analysts and admins can create invoices" 
ON public.invoices 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Analysts and admins can update invoices" 
ON public.invoices 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Only admins can delete invoices" 
ON public.invoices 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Create policies for invoice_items
CREATE POLICY "Authenticated users can view invoice items" 
ON public.invoice_items 
FOR SELECT 
USING (true);

CREATE POLICY "Analysts and admins can manage invoice items" 
ON public.invoice_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

-- Add update trigger for invoices
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample invoices for testing
INSERT INTO public.invoices (invoice_number, supplier_id, issue_date, receipt_date, total_value, status, created_by)
SELECT 
  'NF-2024-001',
  s.id,
  '2024-09-01'::date,
  '2024-09-02'::date,
  15000.00,
  'received',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
FROM public.suppliers s
WHERE s.name = 'Química Brasil Ltda'
LIMIT 1;

INSERT INTO public.invoices (invoice_number, supplier_id, issue_date, receipt_date, total_value, status, created_by)
SELECT 
  'NF-2024-002',
  s.id,
  '2024-09-03'::date,
  '2024-09-04'::date,
  8500.00,
  'received',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
FROM public.suppliers s
WHERE s.name = 'Reagentes Premium'
LIMIT 1;

-- Insert sample invoice items
INSERT INTO public.invoice_items (invoice_id, product_name, product_code, quantity, unit_price, total_price, batch, manufacturing_date, expiry_date, unit)
SELECT 
  i.id,
  'Ácido Sulfúrico 98%',
  'H2SO4-98',
  10.00,
  120.00,
  1200.00,
  'LOTE2024001',
  '2024-08-15'::date,
  '2026-08-15'::date,
  'L'
FROM public.invoices i
WHERE i.invoice_number = 'NF-2024-001';

INSERT INTO public.invoice_items (invoice_id, product_name, product_code, quantity, unit_price, total_price, batch, manufacturing_date, expiry_date, unit)
SELECT 
  i.id,
  'Hidróxido de Sódio',
  'NAOH-99',
  25.00,
  45.00,
  1125.00,
  'LOTE2024002',
  '2024-08-20'::date,
  '2025-08-20'::date,
  'kg'
FROM public.invoices i
WHERE i.invoice_number = 'NF-2024-001';

INSERT INTO public.invoice_items (invoice_id, product_name, product_code, quantity, unit_price, total_price, batch, manufacturing_date, expiry_date, unit)
SELECT 
  i.id,
  'Álcool Etílico 96%',
  'C2H5OH-96',
  50.00,
  35.00,
  1750.00,
  'LOTE2024003',
  '2024-08-25'::date,
  '2025-02-25'::date,
  'L'
FROM public.invoices i
WHERE i.invoice_number = 'NF-2024-002';