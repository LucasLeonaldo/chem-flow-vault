-- Primeiro, vamos criar o location "DEP. Analise" se não existir
INSERT INTO public.locations (name, type, description) 
SELECT 'DEP. Analise', 'laboratory', 'Departamento de Análise - Local padrão para produtos aguardando análise'
WHERE NOT EXISTS (
    SELECT 1 FROM public.locations WHERE name = 'DEP. Analise'
);