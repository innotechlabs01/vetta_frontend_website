"use client";

import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CountrySelect } from "@/components/ui/country-select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { createOrgUserAction } from "../../../actions";
import { useEnvironment } from "@/context/EnvironmentContext";
import { parsePhoneInput } from "@/lib/phone";

type LocMini = { id: string; name: string; is_active: boolean };

export function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { org } = useEnvironment();
  const supabase = getSupabaseBrowser();
  const organizationId = org?.id!;

  const [email, setEmail] = useState("");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [role, setRole] = useState<"owner"|"admin"|"manager"|"member">("member");

  const [phoneCountry, setPhoneCountry] = useState("+57");
  const [phoneLocal, setPhoneLocal] = useState("");
  const phoneDigits = useMemo(() => phoneLocal.replace(/\D/g, ""), [phoneLocal]);
  const phoneValid = useMemo(() => phoneDigits.length >= 6 && phoneDigits.length <= 15, [phoneDigits]);
  const phoneToSend = useMemo(() => (phoneValid ? `${phoneCountry}${phoneDigits}` : null), [phoneValid, phoneCountry, phoneDigits]);

  const [locations, setLocations] = useState<LocMini[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  
  // Menu access state
  const [menus, setMenus] = useState<Array<{ label: string; path: string }>>([]);
  const [selectedMenus, setSelectedMenus] = useState<Set<string>>(new Set());

  const needsLocations = useMemo(() => !["owner","admin"].includes(role), [role]);

  useEffect(() => {
    if (!open || !organizationId) return;
    (async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id,name,is_active")
        .eq("organization_id", organizationId)
        .order("name");
      if (error) toast.error(error.message);
      setLocations((data as LocMini[]) ?? []);
    })();
  }, [open, organizationId, supabase]);

  // Fetch menus
  useEffect(() => {
    if (!open || !org?.id) return;
    (async () => {
      const { data } = await supabase
        .from('menu_config')
        .select('label, path')
        .eq('organization_id', org.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      setMenus(data?.map((m: any) => ({ label: m.label, path: m.path })) ?? []);
    })();
  }, [open, org?.id, supabase]);

  async function onSubmit() {
    try {
      setLoading(true);

      if (!phoneValid) {
        toast.error("Teléfono inválido. Debe tener entre 6 y 15 dígitos.");
        setLoading(false);
        return;
      }

      if (needsLocations && selected.size === 0) {
        toast.error("Selecciona al menos una sucursal.");
        setLoading(false);
        return;
      }

      const res = await createOrgUserAction({
        organizationId,
        // Enviamos formato internacional E.164
        phone: phoneToSend!, 
        firstName, lastName, role,
        locationIds: [...Array.from(selected)],
        menuAccess: [...Array.from(selectedMenus)],
      });

      if (res?.ok) {
        toast.success("Usuario creado");
        onClose();
        // opcional: limpiar
        setFirst(""); setLast(""); setPhoneCountry("+57"); setPhoneLocal(""); setSelected(new Set());
      } else {
        toast.error("No se pudo crear el usuario");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Error creando usuario");
    } finally {
      setLoading(false);
    }
  }

  const onPhoneChange = (rawValue: string) => {
    const parsed = parsePhoneInput(rawValue, phoneCountry);
    if (parsed.hadExplicitCountry && parsed.countryCode !== phoneCountry) {
      setPhoneCountry(parsed.countryCode);
    }
    setPhoneLocal(parsed.formattedNational);
  };

  return (
    <Dialog open={open} onOpenChange={(v)=> v ? null : onClose()}>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
        </DialogHeader>

        <div className="w-full grid gap-5 py-1 px-6 pb-6 m-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Nombres</label>
              <Input
                value={firstName}
                onChange={e=>setFirst(e.target.value)}
                placeholder="Juan"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Apellidos</label>
              <Input value={lastName} onChange={e=>setLast(e.target.value)} placeholder="Pérez" />
            </div>

            {/* Teléfono internacional (E.164) */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Teléfono</label>
              <div className="mt-1 flex gap-2">
                <div className="w-28 shrink-0">
                  <CountrySelect value={phoneCountry} onChange={setPhoneCountry} />
                </div>
                <Input
                  className={`${phoneLocal && !phoneValid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  placeholder="Número sin prefijo"
                  value={phoneLocal}
                  inputMode="numeric"
                  autoComplete="tel"
                  onChange={(e) => {
                    onPhoneChange(e.target.value);
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Puedes pegar formatos como <b>+1 (954) 937-4720</b>. Se limpia y detecta país automáticamente.
              </p>
              {!phoneValid && phoneLocal.length > 0 && (
                <p className="mt-1 text-xs text-destructive">Formato inválido para teléfono internacional.</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Rol</label>
              <div className="mt-1">
                <Select value={role} onValueChange={(v:any)=>setRole(v)}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Selecciona rol" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Locations */}
          {needsLocations ? (
            <div className="mt-2">
              <div className="text-sm font-medium mb-2">Sucursales (requeridas para {role})</div>
              <div className="max-h-[400px] overflow-auto space-y-2 pr-1">
                {locations.map(loc => {
                  const checked = selected.has(loc.id);
                  return (
                    <label key={loc.id} className="flex items-center gap-3 border rounded-lg px-3 py-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v)=> {
                          const next = new Set(selected);
                          v ? next.add(loc.id) : next.delete(loc.id);
                          setSelected(next);
                        }}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{loc.name}</div>
                        {!loc.is_active && <div className="text-xs text-muted-foreground">Cerrada</div>}
                      </div>
                    </label>
                  );
                })}
                {!locations.length && <div className="text-sm text-muted-foreground">No hay sucursales.</div>}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground mt-2">
              Rol <b>{role}</b> tiene acceso a todas las sucursales (no requiere selección).
            </div>
          )}

          {/* Menu Access */}
          <div className="mt-2">
            <div className="text-sm font-medium mb-2">Acceso a menús</div>
            <div className="max-h-[300px] overflow-auto space-y-2 pr-1">
              {menus.map((menu) => {
                const checked = selectedMenus.has(menu.path);
                return (
                  <label key={menu.path} className="flex items-center gap-3 border rounded-lg px-3 py-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = new Set(selectedMenus);
                        v ? next.add(menu.path) : next.delete(menu.path);
                        setSelectedMenus(next);
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{menu.label}</div>
                      <div className="text-xs text-muted-foreground">{menu.path}</div>
                    </div>
                  </label>
                );
              })}
              {!menus.length && <div className="text-sm text-muted-foreground">No hay menús configurados.</div>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Selecciona los menús a los que este usuario tendrá acceso.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onSubmit} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Crear usuario
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
