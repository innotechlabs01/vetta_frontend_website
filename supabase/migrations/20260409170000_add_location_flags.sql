-- Migration para agregar columnas de control POS y Tienda Online
-- Ejecutar este SQL en el panel de Supabase

-- 1. Agregar columna is_pos_enabled a locations
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS is_pos_enabled BOOLEAN DEFAULT false;

-- 2. Agregar columna is_online_store a locations  
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS is_online_store BOOLEAN DEFAULT false;

-- 3. Verificar que se crearon las columnas
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'locations' 
AND column_name IN ('is_pos_enabled', 'is_online_store');
