"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CountrySelect } from "@/components/ui/country-select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { updateOrgUserAction } from "../../../actions";
import { useEnvironment } from "@/context/EnvironmentContext";
import { parsePhoneInput } from "@/lib/phone";

type LocMini = {
  id: string;
  name: string;
  is_active: boolean;
  is_pos_enabled: boolean;
};

type EditUserModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  user: {
    user_id: string;
    full_name: string | null;
    phone: string | null;
    role: "owner" | "admin" | "manager" | "member";
    location_ids: string[] | null;
  } | null;
};

export function EditUserModal({
  open,
  onClose,
  onSaved,
  user,
}: EditUserModalProps) {
  const { org } = useEnvironment();
  const supabase = getSupabaseBrowser();
  const organizationId = org?.id!;

  const [phoneCountry, setPhoneCountry] = useState("+57");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [role, setRole] = useState<"owner" | "admin" | "manager" | "member">(
    "member"
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [locations, setLocations] = useState<LocMini[]>([]);
  const [menuAccess, setMenuAccess] = useState<Array<{ label: string; path: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  const phoneDigits = useMemo(
    () => phoneLocal.replace(/\D/g, ""),
    [phoneLocal]
  );
  const phoneValid = useMemo(
    () => phoneDigits.length >= 6 && phoneDigits.length <= 15,
    [phoneDigits]
  );
  const phoneToSend = useMemo(
    () => (phoneValid ? `${phoneCountry}${phoneDigits}` : null),
    [phoneValid, phoneCountry, phoneDigits]
  );

  const needsLocation = useMemo(
    () => !["owner", "admin"].includes(role),
    [role]
  );

  useEffect(() => {
    if (!open || !organizationId) return;

    (async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id,name,is_active,is_pos_enabled")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name");
      if (error) toast.error(error.message);
      setLocations((data as LocMini[]) ?? []);
    })();
  }, [open, organizationId, supabase]);

  useEffect(() => {
    if (!open || !user) {
      setPhoneLocal("");
      setPhoneCountry("+57");
      setSelectedLocationId("");
      setMenuAccess([]);
      return;
    }

    setInitialLoading(true);

    if (user.phone) {
      const phoneStr = user.phone.replace(/\D/g, "");
      if (phoneStr.startsWith("57")) {
        setPhoneCountry("+57");
        setPhoneLocal(phoneStr.substring(2));
      } else if (phoneStr.startsWith("1") && phoneStr.length === 11) {
        setPhoneCountry("+1");
        setPhoneLocal(phoneStr.substring(1));
      } else {
        setPhoneLocal(phoneStr);
      }
    }

    setRole(user.role);

    if (user.location_ids && user.location_ids.length > 0) {
      setSelectedLocationId(user.location_ids[0]);
    } else {
      setSelectedLocationId("");
    }

    // Fetch menu access based on user's role
    if (org?.id) {
      (async () => {
        const supabase = getSupabaseBrowser();
        const { data } = await supabase
          .from('menu_config')
          .select('label, path')
          .eq('organization_id', org.id)
          .eq('is_active', true)
          .contains('visible_to_roles', [user.role])
          .order('sort_order', { ascending: true });
        
        setMenuAccess(data?.map((m: any) => ({ label: m.label, path: m.path })) ?? []);
      })();
    }

    setInitialLoading(false);
  }, [open, user, org?.id]);

  const onPhoneChange = (rawValue: string) => {
    const parsed = parsePhoneInput(rawValue, phoneCountry);
    if (parsed.hadExplicitCountry && parsed.countryCode !== phoneCountry) {
      setPhoneCountry(parsed.countryCode);
    }
    setPhoneLocal(parsed.formattedNational);
  };

  async function onSubmit() {
    if (!user) return;

    try {
      setLoading(true);

      const finalPhone = phoneValid ? phoneToSend : null;
      if (!finalPhone) {
        toast.error(
          "Teléfono inválido. Debe tener entre 6 y 15 dígitos."
        );
        setLoading(false);
        return;
      }

      if (needsLocation && !selectedLocationId) {
        toast.error("Selecciona una sucursal.");
        setLoading(false);
        return;
      }

      const res = await updateOrgUserAction({
        organizationId,
        userId: user.user_id,
        phone: finalPhone,
        role,
        locationIds: selectedLocationId ? [selectedLocationId] : [],
      });

      if (res?.ok) {
        toast.success("Usuario actualizado");
        onSaved();
        onClose();
      } else {
        toast.error("No se pudo actualizar el usuario");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Error actualizando usuario");
    } finally {
      setLoading(false);
    }
  }

  const isOwner = user?.role === "owner";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (v ? null : onClose())}
    >
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
        </DialogHeader>

        {initialLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="w-full grid gap-5 py-1 px-6 pb-6 m-auto">
            <div className="grid grid-cols-1">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={user?.full_name ?? ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Teléfono</label>
              <div className="mt-1 flex gap-2">
                <div className="w-28 shrink-0">
                  <CountrySelect
                    value={phoneCountry}
                    onChange={setPhoneCountry}
                  />
                </div>
                <Input
                  className={`${
                    phoneLocal && !phoneValid
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }`}
                  placeholder="Número sin prefijo"
                  value={phoneLocal}
                  inputMode="numeric"
                  autoComplete="tel"
                  onChange={(e) => onPhoneChange(e.target.value)}
                />
              </div>
              {!phoneValid && phoneLocal.length > 0 && (
                <p className="mt-1 text-xs text-destructive">
                  Formato inválido para teléfono internacional.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Rol</label>
              <div className="mt-1">
                <Select
                  value={role}
                  onValueChange={(v: "owner" | "admin" | "manager" | "member") =>
                    setRole(v)
                  }
                  disabled={isOwner}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Selecciona rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="member">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {needsLocation && (
              <div>
                <div className="text-sm font-medium mb-2">
                  Sucursal asignada
                </div>
                {locations.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 border rounded-lg">
                    No hay sucursales disponibles.
                  </div>
                ) : (
                  <Select
                    value={selectedLocationId}
                    onValueChange={setSelectedLocationId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona la sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {!needsLocation && (
              <div className="text-sm text-muted-foreground">
                Rol <b>{role}</b> tiene acceso a todas las sucursales.
              </div>
            )}

            {/* Menus this user can access (read-only, based on role) */}
            <div>
              <div className="text-sm font-medium mb-2">
                Menús que puede ver (automático por rol)
              </div>
              <div className="flex flex-wrap gap-1">
                {menuAccess.length > 0 ? (
                  menuAccess.map((menu: any, idx: number) => (
                    <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {menu.label}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No hay menús activos para este rol</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Los menus se asignan automaticamente segun el rol del usuario en la columna de la tabla.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={onSubmit} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Guardar cambios
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}