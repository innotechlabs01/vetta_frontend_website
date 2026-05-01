-- Add columns to support better menu organization
ALTER TABLE IF EXISTS public.menu_config 
ADD COLUMN IF NOT EXISTS is_father BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS always_visible BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN public.menu_config.is_father IS 'UI hint: render with chevron (even if no children yet)';
COMMENT ON COLUMN public.menu_config.always_visible IS 'TRUE = always show (skip role check), e.g., Inicio';

-- Update Inicio to be always visible
UPDATE public.menu_config SET always_visible = TRUE WHERE path = '/home';
