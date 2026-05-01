// app/(dashboard)/settings/menu/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useEnvironment } from "@/context/EnvironmentContext";
import { createClient } from "@/utils/supabase/client";
import { getIcon, searchIcons, getAvailableIconNames } from "@/lib/icon-map";
import { Check, X, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

type MenuItem = {
  id?: string;
  path: string;
  label: string;
  icon_name: string;
  is_active: boolean;
  sort_order: number;
  parent_id?: string | null;
  visible_to_roles?: string[];
};

export default function MenuSettingsPage() {
  const { org, memberRole } = useEnvironment();
  const supabase = createClient();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  
  // Icon picker state
  const [iconSearch, setIconSearch] = useState("");
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null);
  const [iconList, setIconList] = useState<string[]>([]);

  const isAdmin = memberRole === "owner" || memberRole === "admin";
  
  const AVAILABLE_ROLES = ['owner', 'admin', 'manager', 'member', 'viewer'];
  
  // New menu item form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    path: '',
    label: '',
    icon_name: 'Circle',
    sort_order: 0,
    parent_id: '' as string | null,
    visible_to_roles: ['owner', 'admin', 'manager', 'member', 'viewer'] as string[]
  });

  const fetchMenuConfig = useCallback(async () => {
    if (!org?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("menu_config")
        .select("*")
        .eq("organization_id", org.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (err: any) {
      console.error("Error fetching menu config:", err);
      toast.error("Error al cargar configuración del menú");
    } finally {
      setLoading(false);
    }
  }, [supabase, org?.id]);

  useEffect(() => {
    fetchMenuConfig();
  }, [fetchMenuConfig]);

  // Load icon list when picker opens
  useEffect(() => {
    if (showIconPicker) {
      setIconList(getAvailableIconNames());
    }
  }, [showIconPicker]);

  const handleToggleActive = async (item: MenuItem) => {
    if (!org?.id || !item.id) return;
    
    setSaving(item.id);
    try {
      const { error } = await supabase
        .from("menu_config")
        .update({ is_active: !item.is_active, updated_at: new Date().toISOString() })
        .eq("id", item.id)
        .eq("organization_id", org.id);

      if (error) throw error;

      setMenuItems(prev => 
        prev.map(mi => mi.id === item.id ? { ...mi, is_active: !mi.is_active } : mi)
      );
      
      toast.success(`"${item.label}" ${!item.is_active ? "activado" : "desactivado"}`);
    } catch (err: any) {
      console.error("Error updating menu item:", err);
      toast.error("Error al actualizar");
    } finally {
      setSaving(null);
    }
  };

  const handleIconChange = async (item: MenuItem, newIconName: string) => {
    if (!org?.id || !item.id) return;
    
    setSaving(item.id);
    setShowIconPicker(null);
    
    try {
      const { error } = await supabase
        .from("menu_config")
        .update({ icon_name: newIconName, updated_at: new Date().toISOString() })
        .eq("id", item.id)
        .eq("organization_id", org.id);

      if (error) throw error;
      
      setMenuItems(prev => 
        prev.map(mi => mi.id === item.id ? { ...mi, icon_name: newIconName } : mi)
      );
      
      toast.success(`Icono de "${item.label}" actualizado`);
    } catch (err: any) {
      console.error("Error updating icon:", err);
      toast.error("Error al actualizar icono");
    } finally {
      setSaving(null);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.id) return;

    setSaving('form');
    try {
      const menuData = {
        path: formData.path,
        label: formData.label,
        icon_name: formData.icon_name,
        sort_order: formData.sort_order,
        parent_id: formData.parent_id || null,
        visible_to_roles: formData.visible_to_roles,
        updated_at: new Date().toISOString()
      };

      if (editingItem?.id) {
        // Update existing
        const { error } = await supabase
          .from("menu_config")
          .update(menuData)
          .eq("id", editingItem.id)
          .eq("organization_id", org.id);

        if (error) throw error;
        toast.success("Elemento actualizado");
      } else {
        // Create new
        const { error } = await supabase
          .from("menu_config")
          .insert({
            ...menuData,
            organization_id: org.id,
            is_active: true,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        toast.success("Elemento creado");
      }

      setShowAddForm(false);
      setEditingItem(null);
      setFormData({ path: '', label: '', icon_name: 'Circle', sort_order: menuItems.length + 1, parent_id: '', visible_to_roles: ['owner', 'admin', 'manager', 'member', 'viewer'] });
      fetchMenuConfig();
    } catch (err: any) {
      console.error("Error saving menu item:", err);
      toast.error("Error al guardar: " + err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (item: MenuItem) => {
    if (!org?.id || !item.id) return;
    
    // Check if it has children
    const hasChildren = menuItems.some(mi => mi.parent_id === item.id);
    if (hasChildren) {
      toast.error("No se puede eliminar: tiene elementos hijos");
      return;
    }
    
    if (!confirm(`¿Eliminar "${item.label}" del menú?`)) return;

    setSaving(item.id);
    try {
      const { error } = await supabase
        .from("menu_config")
        .delete()
        .eq("id", item.id)
        .eq("organization_id", org.id);

      if (error) throw error;
      
      setMenuItems(prev => prev.filter(mi => mi.id !== item.id));
      toast.success("Elemento eliminado");
    } catch (err: any) {
      console.error("Error deleting menu item:", err);
      toast.error("Error al eliminar");
    } finally {
      setSaving(null);
    }
  };

  const getParentLabel = (parentId: string | null | undefined) => {
    if (!parentId) return '--';
    const parent = menuItems.find(mi => mi.id === parentId);
    return parent ? parent.label : 'Unknown';
  };

  const startEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      path: item.path,
      label: item.label,
      icon_name: item.icon_name,
      sort_order: item.sort_order,
      parent_id: item.parent_id || '',
      visible_to_roles: item.visible_to_roles || ['owner', 'admin', 'manager', 'member', 'viewer']
    });
    setShowAddForm(true);
  };

  const filteredIcons = iconSearch 
    ? searchIcons(iconSearch)
    : iconList;

  const renderIcon = (iconName: string) => {
    const IconComponent = getIcon(iconName);
    return <IconComponent className="h-5 w-5" />;
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración del Menú</h1>
        <p className="text-gray-600 mt-1">
          Activa o desactiva elementos del menú para tu organización
        </p>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Elementos del Menú</h2>
            <Button onClick={() => { setEditingItem(null); setFormData({ path: '', label: '', icon_name: 'Circle', sort_order: menuItems.length + 1, parent_id: '', visible_to_roles: ['owner', 'admin', 'manager', 'member', 'viewer'] }); setShowAddForm(!showAddForm); }}>
              {showAddForm ? 'Cancelar' : 'Crear nuevo elemento'}
            </Button>
          </div>

        {showAddForm && (
          <form onSubmit={handleCreateOrUpdate} className="p-4 bg-gray-50 border-b space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ruta (path)</label>
                <Input 
                  value={formData.path} 
                  onChange={(e) => setFormData({...formData, path: e.target.value})}
                  placeholder="/nueva-pagina"
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Etiqueta (label)</label>
                <Input 
                  value={formData.label} 
                  onChange={(e) => setFormData({...formData, label: e.target.value})}
                  placeholder="Nueva Página"
                  required 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Padre (Parent)</label>
                <select
                  value={formData.parent_id || ''}
                  onChange={(e) => setFormData({...formData, parent_id: e.target.value || ''})}
                  className="w-full px-3 py-2 border rounded-md bg-white"
                >
                  <option value="">-- Ninguno (Menú Principal) --</option>
                  {menuItems
                    .filter(mi => !mi.parent_id && mi.id !== editingItem?.id)
                    .map(mi => (
                      <option key={mi.id} value={mi.id}>{mi.label}</option>
                    ))
                  }
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Orden</label>
                <Input 
                  type="number"
                  value={formData.sort_order} 
                  onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Icono</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(showIconPicker ? null : 'form')}
                    className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50 w-full"
                  >
                    {renderIcon(formData.icon_name)}
                    <span className="text-sm">{formData.icon_name}</span>
                  </button>
                  {showIconPicker === 'form' && (
                    <div className="absolute left-0 top-full mt-1 w-80 bg-white border rounded-lg shadow-lg z-50 p-2">
                      <Input
                        placeholder="Buscar iconos..."
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        className="mb-2 text-sm"
                      />
                      <div className="max-h-48 overflow-y-auto grid grid-cols-6 gap-1">
                        {filteredIcons.map((iconName) => (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => { setFormData({...formData, icon_name: iconName}); setShowIconPicker(null); }}
                            className={`p-2 rounded-md hover:bg-blue-50 flex items-center justify-center ${formData.icon_name === iconName ? 'bg-blue-100' : ''}`}
                            title={iconName}
                          >
                            {renderIcon(iconName)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Orden</label>
                <Input 
                  type="number"
                  value={formData.sort_order} 
                  onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Visible para roles</label>
              <div className="flex gap-4">
                {AVAILABLE_ROLES.map(role => (
                  <label key={role} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.visible_to_roles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, visible_to_roles: [...formData.visible_to_roles, role]})
                        } else {
                          setFormData({...formData, visible_to_roles: formData.visible_to_roles.filter(r => r !== role)})
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">{role}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving === 'form'}>
                {saving === 'form' ? 'Guardando...' : editingItem ? 'Actualizar' : 'Crear'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowAddForm(false); setEditingItem(null); }}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Elemento</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Padre</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Ruta</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Icono</th>
                <th className="text-center p-4 text-sm font-medium text-gray-600">Roles</th>
                <th className="text-center p-4 text-sm font-medium text-gray-600">Estado</th>
                <th className="text-center p-4 text-sm font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {menuItems
                .filter(mi => !mi.parent_id) // Show only top-level items
                .map((item) => (
                  <>
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-md">
                            {renderIcon(item.icon_name)}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">{item.label}</span>
                            {menuItems.some(child => child.parent_id === item.id) && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Padre</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-500">--</td>
                      <td className="p-4 text-sm text-gray-600 font-mono">{item.path}</td>
                      <td className="p-4">
                        <button
                          onClick={() => { setShowIconPicker(showIconPicker === item.id ? null : item.id ?? null); }}
                          className="flex items-center gap-2 px-3 py-1.5 border rounded-md hover:bg-gray-50"
                        >
                          {renderIcon(item.icon_name)}
                          <span className="text-sm">{item.icon_name}</span>
                        </button>
                        {showIconPicker === item.id && (
                          <div className="absolute left-0 top-full mt-1 w-80 bg-white border rounded-lg shadow-lg z-50 p-2">
                            <Input
                              placeholder="Buscar iconos..."
                              value={iconSearch}
                              onChange={(e) => setIconSearch(e.target.value)}
                              className="mb-2 text-sm"
                            />
                            <div className="max-h-48 overflow-y-auto grid grid-cols-6 gap-1">
                              {filteredIcons.map((iconName) => (
                                <button
                                  key={iconName}
                                  onClick={() => handleIconChange(item, iconName)}
                                  disabled={saving === item.id}
                                  className={`p-2 rounded-md hover:bg-blue-50 flex items-center justify-center ${item.icon_name === iconName ? 'bg-blue-100' : ''}`}
                                  title={iconName}
                                >
                                  {renderIcon(iconName)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {(item.visible_to_roles || []).map(role => (
                            <span key={role} className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{role}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={item.is_active}
                            onCheckedChange={() => handleToggleActive(item)}
                            disabled={saving === item.id}
                          />
                          {saving === item.id && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(item)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {/* Render children */}
                    {menuItems
                      .filter(child => child.parent_id === item.id)
                      .map(child => (
                        <tr key={child.id} className="border-b bg-gray-50/50">
                          <td className="p-4 pl-12">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-100 rounded-md">
                                {renderIcon(child.icon_name)}
                              </div>
                              <span className="font-medium text-gray-700">{child.label}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600">{item.label}</td>
                          <td className="p-4 text-sm text-gray-600 font-mono">{child.path}</td>
                          <td className="p-4">
                            <span className="text-sm">{child.icon_name}</span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {(child.visible_to_roles || []).map(role => (
                                <span key={role} className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{role}</span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <Switch
                              checked={child.is_active}
                              onCheckedChange={() => handleToggleActive(child)}
                              disabled={saving === child.id}
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(child)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(child)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Los cambios se aplican inmediatamente. Los usuarios verán el menú actualizado al recargar la página.
        </p>
      </div>
    </div>
  );
}
