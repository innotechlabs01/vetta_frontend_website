-- Seed ALL menu items for existing organizations
-- Includes all routes from the app with proper hierarchy

INSERT INTO public.menu_config (organization_id, path, label, icon_name, is_active, sort_order)
SELECT 
  o.id as organization_id,
  m.path,
  m.label,
  m.icon_name,
  true as is_active,
  m.sort_order
FROM public.organizations o
CROSS JOIN (VALUES
  -- Main Navigation (1-99)
  ('/home', 'Inicio', 'Home', 10),
  ('/pos/new', 'Punto de Venta', 'Store', 20),
  ('/sales', 'Pedidos', 'ShoppingCart', 30),
  ('/sales/suscriptions', 'Suscripciones', 'CreditCard', 35),
  ('/deliveries', 'Domicilios', 'Bike', 40),
  ('/customers', 'Clientes', 'Users', 50),
  ('/customers/segments', 'Segmentos', 'Users', 55),
  
  -- Inventory (100-199)
  ('/items', 'Inventario', 'Tag', 100),
  ('/items/categories', 'Categorías', 'Tag', 110),
  ('/items/discounts', 'Descuentos', 'Percent', 120),
  ('/items/modifiers', 'Modificadores', 'Settings', 130),
  ('/items/options', 'Opciones', 'Settings', 140),
  ('/items/plans', 'Planes', 'CreditCard', 150),
  ('/items/warehouse', 'Almacén', 'Warehouse', 160),
  
  -- Online & Marketing (200-299)
  ('/online', 'Online', 'Globe', 200),
  ('/online/qr-codes', 'QR Codes', 'QrCode', 210),
  ('/loyalty', 'Lealtad', 'Award', 220),
  ('/marketing', 'Marketing', 'Megaphone', 230),
  ('/promotions', 'Promociones', 'Megaphone', 240),
  ('/referrals', 'Referidos', 'UserPlus', 250),
  
  -- Reports (300-399)
  ('/reports', 'Informes', 'FileText', 300),
  ('/reports/balance', 'Balance', 'DollarSign', 310),
  ('/reports/transactions', 'Transacciones', 'FileText', 320),
  
  -- Location & Organization (400-499)
  ('/location/dashboard', 'Dashboard Ubicación', 'Map', 400),
  ('/organization/dashboard', 'Dashboard Org', 'Building', 410),
  
  -- Settings (500-599)
  ('/settings', 'Configuraciones', 'Settings', 500),
  ('/settings/drivers', 'Domiciliarios', 'Bike', 510),
  ('/settings/general', 'General', 'Settings', 520),
  ('/settings/integrations', 'Integraciones', 'Plug', 530),
  ('/settings/locations', 'Ubicaciones', 'MapPin', 540),
  ('/settings/menu', 'Menú', 'Menu', 550),
  ('/settings/payments', 'Pagos', 'CreditCard', 560),
  ('/settings/pos-terminals', 'Terminales POS', 'Monitor', 570),
  ('/settings/print-zones', 'Zonas de Impresión', 'Printer', 580),
  ('/settings/profile', 'Perfil', 'User', 590),
  ('/settings/users', 'Usuarios', 'Users', 600)
) AS m(path, label, icon_name, sort_order)
ON CONFLICT (organization_id, path) DO NOTHING;

-- Create a function to automatically add default menu config for new organizations
CREATE OR REPLACE FUNCTION public.handle_new_org_menu_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.menu_config (organization_id, path, label, icon_name, is_active, sort_order)
  SELECT 
    NEW.id,
    m.path,
    m.label,
    m.icon_name,
    true,
    m.sort_order
  FROM (VALUES
    ('/home', 'Inicio', 'Home', 10),
    ('/pos/new', 'Punto de Venta', 'Store', 20),
    ('/sales', 'Pedidos', 'ShoppingCart', 30),
    ('/sales/suscriptions', 'Suscripciones', 'CreditCard', 35),
    ('/deliveries', 'Domicilios', 'Bike', 40),
    ('/customers', 'Clientes', 'Users', 50),
    ('/items', 'Inventario', 'Tag', 100),
    ('/online', 'Online', 'Globe', 200),
    ('/promotions', 'Promociones', 'Megaphone', 240),
    ('/settings/drivers', 'Domiciliarios', 'Bike', 510),
    ('/reports/transactions', 'Informes', 'FileText', 320),
    ('/settings', 'Configuraciones', 'Settings', 500)
  ) AS m(path, label, icon_name, sort_order)
  ON CONFLICT (organization_id, path) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
