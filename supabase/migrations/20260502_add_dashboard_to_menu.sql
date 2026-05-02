-- Insert dashboard into menu_config if it doesn't exist
INSERT INTO menu_config (organization_id, path, label, icon_name, is_active, sort_order, parent_id, is_father, always_visible, visible_to_roles)
SELECT 
  org.id as organization_id,
  '/organization/dashboard' as path,
  'Dashboard General' as label,
  'BarChart3' as icon_name,
  true as is_active,
  1 as sort_order,
  null as parent_id,
  false as is_father,
  false as always_visible,
  ARRAY['owner', 'admin'] as visible_to_roles
FROM organizations org
WHERE NOT EXISTS (
  SELECT 1 FROM menu_config mc WHERE mc.path = '/organization/dashboard' AND mc.organization_id = org.id
);
