-- Create menu_config table for dynamic sidebar menu management
CREATE TABLE IF NOT EXISTS public.menu_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  path TEXT NOT NULL, -- e.g., "/home", "/pos/new"
  label TEXT NOT NULL, -- e.g., "Inicio", "Punto de Venta"
  icon_name TEXT NOT NULL, -- lucide-react icon name: "Home", "Store", etc.
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Each org can only have one config per path
  UNIQUE(organization_id, path)
);

-- Enable Row Level Security
ALTER TABLE public.menu_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DO $$ 
BEGIN
  -- Drop policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_config' AND policyname = 'Org members can view menu_config') THEN
    DROP POLICY "Org members can view menu_config" ON public.menu_config;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_config' AND policyname = 'Only owners/admins can update menu_config') THEN
    DROP POLICY "Only owners/admins can update menu_config" ON public.menu_config;
  END IF;
END 
$$;

-- Policy: Org members can view menu config
CREATE POLICY "Org members can view menu_config" 
  ON public.menu_config
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = menu_config.organization_id
      AND user_id = auth.uid()
    )
  );

-- Policy: Only owners/admins can update menu config
CREATE POLICY "Only owners/admins can update menu_config" 
  ON public.menu_config
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = menu_config.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_config TO authenticated;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_menu_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_menu_config_updated_at ON public.menu_config;
CREATE TRIGGER update_menu_config_updated_at
  BEFORE UPDATE ON public.menu_config
  FOR EACH ROW
  EXECUTE FUNCTION update_menu_config_updated_at();
