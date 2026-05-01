-- Create a helper function to get menu_config ID by path
CREATE OR REPLACE FUNCTION get_menu_id_by_path(org_id UUID, menu_path TEXT)
RETURNS UUID AS $$
  SELECT id FROM public.menu_config 
  WHERE organization_id = org_id AND path = menu_path 
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Seed ALL menu items for existing organizations
-- With proper parent-child hierarchy
DELETE FROM public.menu_config WHERE TRUE;

-- Insert ALL items (flat, no parent yet)
INSERT INTO public.menu_config (organization_id, path, label, icon_name, is_active, sort_order, is_father, always_visible, visible_to_roles)
SELECT 
  o.id as organization_id,
  m.path,
  m.label,
  m.icon_name,
  true as is_active,
  m.sort_order,
  m.is_father,
  m.always_visible,
  m.visible_to_roles
FROM public.organizations o
CROSS JOIN (VALUES
  -- Top-level items (parent_id = NULL)
  ('/home', 'Inicio', 'Home', 10, FALSE, TRUE, ARRAY['owner', 'admin', 'manager', 'member', 'viewer']),
  ('/pos/new', 'Punto de Venta', 'Store', 20, FALSE, FALSE, ARRAY['owner', 'admin', 'manager', 'member']),
  ('/sales', 'Pedidos', 'ShoppingCart', 30, FALSE, FALSE, ARRAY['owner', 'admin', 'manager', 'member']),
  ('/sales/subscriptions', 'Suscripciones', 'CreditCard', 35, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/deliveries', 'Domicilios', 'Bike', 40, FALSE, FALSE, ARRAY['owner', 'admin', 'manager', 'member']),
  
  -- Clientes (FATHER)
  ('/customers', 'Clientes', 'Users', 50, TRUE, FALSE, ARRAY['owner', 'admin', 'manager', 'member']),
  ('/customers/segments', 'Segmentos', 'Users', 55, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  
  -- Inventory (FATHER)
  ('/items', 'Inventario', 'Tag', 100, TRUE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/items/categories', 'Categorías', 'Tag', 110, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/items/discounts', 'Descuentos', 'Percent', 120, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/items/modifiers', 'Modificadores', 'Settings', 130, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/items/options', 'Opciones', 'Settings', 140, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/items/plans', 'Planes', 'CreditCard', 150, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/items/warehouse', 'Almacén', 'Warehouse', 160, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  
  -- Online (FATHER)
  ('/online', 'Online', 'Globe', 200, TRUE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/online/qr-codes', 'QR Codes', 'QrCode', 210, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  
  -- Loyalty & Marketing (FATHER)
  ('/loyalty', 'Lealtad', 'Award', 220, TRUE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/marketing', 'Marketing', 'Megaphone', 230, TRUE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/promotions', 'Promociones', 'Megaphone', 240, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/referrals', 'Referidos', 'UserPlus', 250, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  
  -- Reports (FATHER)
  ('/reports', 'Informes', 'FileText', 300, TRUE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/reports/balance', 'Balance', 'DollarSign', 310, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/reports/transactions', 'Transacciones', 'FileText', 320, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  
  -- Settings (FATHER)
  ('/settings', 'Configuraciones', 'Settings', 500, TRUE, FALSE, ARRAY['owner', 'admin', 'manager', 'member']),
  ('/settings/drivers', 'Domiciliarios', 'Bike', 510, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/settings/general', 'General', 'Settings', 520, FALSE, FALSE, ARRAY['owner', 'admin', 'manager', 'member']),
  ('/settings/integrations', 'Integraciones', 'Plug', 530, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/settings/locations', 'Ubicaciones', 'MapPin', 540, FALSE, FALSE, ARRAY['owner', 'admin', 'manager']),
  ('/settings/menu', 'Menú', 'Menu', 550, FALSE, FALSE, ARRAY['owner', 'admin']),
  ('/settings/payments', 'Pagos', 'CreditCard', 560, FALSE, FALSE, ARRAY['owner', 'admin']),
  ('/settings/pos-terminals', 'Terminales POS', 'Monitor', 570, FALSE, FALSE, ARRAY['owner', 'admin']),
  ('/settings/print-zones', 'Zonas de Impresión', 'Printer', 580, FALSE, FALSE, ARRAY['owner', 'admin']),
  ('/settings/profile', 'Perfil', 'User', 590, FALSE, FALSE, ARRAY['owner', 'admin', 'manager', 'member', 'viewer']),
  ('/settings/users', 'Usuarios', 'Users', 600, FALSE, FALSE, ARRAY['owner', 'admin'])
) AS m(path, label, icon_name, sort_order, is_father, always_visible, visible_to_roles)
ON CONFLICT (organization_id, path) DO UPDATE SET
  label = EXCLUDED.label,
  icon_name = EXCLUDED.icon_name,
  sort_order = EXCLUDED.sort_order,
  is_father = EXCLUDED.is_father,
  always_visible = EXCLUDED.always_visible,
  visible_to_roles = EXCLUDED.visible_to_roles;

-- Now update parent_id for children
UPDATE public.menu_config child
SET parent_id = parent.id
FROM public.menu_config parent
WHERE child.organization_id = parent.organization_id
  AND (
    (child.path LIKE '/customers/%' AND parent.path = '/customers' AND child.path != '/customers')
    OR (child.path LIKE '/items/%' AND parent.path = '/items' AND child.path != '/items')
    OR (child.path LIKE '/online/%' AND parent.path = '/online' AND child.path != '/online')
    OR (child.path LIKE '/marketing/%' AND parent.path = '/marketing' AND child.path != '/marketing')
    OR (child.path = '/promotions' AND parent.path = '/marketing')
    OR (child.path = '/referrals' AND parent.path = '/marketing')
    OR (child.path LIKE '/loyalty%' AND parent.path = '/loyalty')
    OR (child.path LIKE '/reports/%' AND parent.path = '/reports' AND child.path != '/reports')
    OR (child.path LIKE '/sales/%' AND parent.path = '/sales' AND child.path != '/sales')
    OR (child.path LIKE '/settings/%' AND parent.path = '/settings' AND child.path != '/settings')
  );

-- Drop the helper function (optional, can keep it)
-- DROP FUNCTION IF EXISTS get_menu_id_by_path(UUID, TEXT);
