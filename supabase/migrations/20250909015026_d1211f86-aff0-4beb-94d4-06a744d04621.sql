-- Primeiro, vamos buscar o location "DEP. Analise" ou criar se não existir
INSERT INTO public.locations (name, type, description) 
VALUES ('DEP. Analise', 'laboratory', 'Departamento de Análise - Local padrão para produtos aguardando análise')
ON CONFLICT (name) DO NOTHING;