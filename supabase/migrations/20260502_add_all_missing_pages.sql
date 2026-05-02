-- Add all missing pages to menu_config for each organization
INSERT INTO menu_config (organization_id, path, label, icon_name, is_active, sort_order, parent_id, is_father, always_visible, visible_to_roles)
SELECT 
  org.id as organization_id,
  paths.path,
  paths.label,
  paths.icon_name,
  true as is_active,
  paths.sort_order,
  null as parent_id,
  false as is_father,
  false as always_visible,
  paths.visible_to_roles::text[]
FROM organizations org
CROSS JOIN (
  VALUES 
    ('/settings/users', 'Usuarios', 'Users', 10, ARRAY['owner', 'admin']),
    ('/settings/general', 'Configuración General', 'Settings', 11, ARRAY['owner', 'admin']),
    ('/settings/locations', 'Sucursales', 'StoreIcon', 12, ARRAY['owner', 'admin']),
    ('/settings/pos-terminals', 'Terminales POS', 'Monitor', 13, ARRAY['owner', 'admin']),
    ('/settings/print-zones', 'Zonas de Impresión', 'Printer', 14, ARRAY['owner', 'admin']),
    ('/settings/payments', 'Métodos de Pago', 'CreditCard', 15, ARRAY['owner', 'admin']),
    ('/settings/drivers', 'Conductores', 'Bike', 16, ARRAY['owner', 'admin', 'manager']),
    ('/settings/menu', 'Configuración de Menú', 'Menu', 17, ARRAY['owner', 'admin']),
    ('/settings/profile', 'Mi Perfil', 'User', 18, ARRAY['owner', 'admin', 'manager', 'member']),
    ('/items/products', 'Productos', 'ShoppingCart', 20, ARRAY['owner', 'admin', 'manager']),
    ('/items/categories', 'Categorías', 'Tag', 21, ARRAY['owner', 'admin', 'manager']),
    ('/items/plans', 'Planes', 'Star', 22, ARRAY['owner', 'admin']),
    ('/items/discounts', 'Descuentos', 'Percent', 23, ARRAY['owner', 'admin']),
    ('/sales', 'Ventas', 'DollarSign', 30, ARRAY['owner', 'admin', 'manager', 'member']),
    ('/sales/subscriptions', 'Suscripciones', 'Repeat', 31, ARRAY['owner', 'admin']),
    ('/deliveries', 'Domicilios', 'Bike', 32, ARRAY['owner', 'admin', 'manager']),
    ('/customers', 'Clientes', 'Users', 33, ARRAY['owner', 'admin', 'manager']),
    ('/customers/segments', 'Segmentos', 'Target', 34, ARRAY['owner', 'admin', 'manager']),
    ('/reports', 'Reportes', 'BarChart3', 40, ARRAY['owner', 'admin']),
    ('/reports/balance', 'Balance', 'DollarSign', 41, ARRAY['owner', 'admin']),
    ('/reports/transactions', 'Transacciones', 'Activity', 42, ARRAY['owner', 'admin'])
) AS paths(path, label, icon_name, sort_order, visible_to_roles)
WHERE NOT EXISTS (
  SELECT 1 FROM menu_config mc 
  WHERE mc.path = paths.path AND mc.organization_id = org.id
);
