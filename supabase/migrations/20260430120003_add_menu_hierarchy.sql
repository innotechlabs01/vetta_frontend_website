-- Add parent-child relationship and role-based access to menu_config
ALTER TABLE IF EXISTS public.menu_config 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.menu_config(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS visible_to_roles TEXT[] DEFAULT ARRAY['owner', 'admin', 'manager', 'member', 'viewer'];

-- Add index for parent_id queries
CREATE INDEX IF NOT EXISTS idx_menu_config_parent ON public.menu_config(parent_id);

-- Add comment explaining the columns
COMMENT ON COLUMN public.menu_config.parent_id IS 'NULL = top-level item, UUID = submenu item under parent';
COMMENT ON COLUMN public.menu_config.visible_to_roles IS 'Array of roles that can see this menu item. NULL or empty = visible to all.';

-- Update existing items to be visible to all roles (since they were already created)
UPDATE public.menu_config 
SET visible_to_roles = ARRAY['owner', 'admin', 'manager', 'member', 'viewer']
WHERE visible_to_roles IS NULL;
