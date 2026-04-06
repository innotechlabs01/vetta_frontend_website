// app/profile/ProfilePageClient.tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { User, Pencil, ShieldCheck, LogOut } from "lucide-react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null; // yyyy-mm-dd
  avatar_url: string | null;
};

export default function ProfilePageClient() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Cargar usuario y perfil (o crearlo si no existe)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        if (!user) {
          toast.error("No has iniciado sesión");
          return;
        }

        const { data: rows, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .limit(1);

        if (error) throw error;

        let current = rows?.[0] as Profile | undefined;

        if (!current) {
          const defaults = {
            user_id: user.id,
            full_name: (user.user_metadata?.name as string) || null,
            email: user.email ?? null,
            phone: null,
            birthday: null,
            avatar_url: null,
          };
          const { data: inserted, error: insErr } = await supabase
            .from("profiles")
            .insert(defaults)
            .select("*")
            .single();
          if (insErr) throw insErr;
          current = inserted as Profile;
        }

        if (mounted) setProfile(current);
      } catch (e) {
        console.error(e);
        toast.error("No se pudo cargar tu perfil");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [supabase]);

  async function handleAvatarUpload(file: File) {
    if (!profile) return;
    try {
      setSaving(true);
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${profile.user_id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || undefined,
        });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
      if (error) throw error;

      setProfile((p) => (p ? { ...p, avatar_url: url } : p));
      toast.success("Foto de perfil actualizada");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar la foto");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="w-full py-8">
          <div className="max-w-3xl mx-auto px-4">
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-3" />
            <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 pb-12 space-y-4">
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base mb-2">Información personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="grid sm:grid-cols-3 gap-3">
                  <span className="h-4 bg-gray-200 animate-pulse rounded" />
                  <span className="sm:col-span-2 h-4 bg-gray-200 animate-pulse rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        No se encontró el perfil.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="w-full py-8">
        <div className="max-w-3xl mx-auto px-4 flex items-center gap-4">
          <div className="relative w-24 h-24 rounded-full bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center overflow-hidden">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.full_name || "Avatar"} width={100} height={100} className="object-cover" />
            ) : (
              <User className="w-10 h-10 text-gray-400" />
            )}

            <label className="absolute inset-0 opacity-0 hover:opacity-100 flex items-center justify-center bg-black/40 cursor-pointer">
              <span className="text-white text-xs px-2 py-1 rounded bg-black/60">
                {saving ? "Subiendo..." : "Cambiar foto"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={saving}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarUpload(f);
                }}
              />
            </label>
          </div>

          <div>
            <h1 className="text-2xl font-semibold">{profile.full_name || "Mi perfil"}</h1>
            <p className="text-gray-500 text-sm">Configuración personal</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-12 space-y-4">
        {/* ===== Tarjeta 1: Información personal ===== */}
        <HoverEditableCard title="Información personal">
          <div className="space-y-3">
            <Row label="Nombre">{profile.full_name || "..."}</Row>
            <Row label="Correo">{profile.email || "..."}</Row>
            <Row label="Teléfono">{profile.phone || "..."}</Row>
            <Row label="Fecha de nacimiento">
              {profile.birthday ? new Date(profile.birthday).toLocaleDateString() : "..."}
            </Row>
          </div>

          <EditSectionDialog title="Editar información personal">
            <ProfileForm
              profile={profile}
              onSaved={(next) => setProfile((p) => (p ? { ...p, ...next } as Profile : p))}
            />
          </EditSectionDialog>
        </HoverEditableCard>

        {/* ===== Tarjeta 2: Seguridad de la cuenta ===== */}
        <Card className="border shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <CardTitle>Seguridad de la cuenta</CardTitle>
            </div>
            <CardDescription>
              Administra tus sesiones. Puedes cerrar esta sesión o cerrar sesión en todos tus dispositivos.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={async () => {
                try {
                  const { error } = await supabase.auth.signOut({ scope: "global" });
                  if (error) throw error;
                  toast.success("Cerraste sesión en todos los dispositivos");
                  router.push("/");
                } catch (err: any) {
                  console.error(err);
                  toast.error(err?.message || "No se pudo cerrar todas las sesiones");
                }
              }}
              variant="secondary"
              className="gap-2"
            >
              Cerrar todas las sesiones
            </Button>

            <Button
              onClick={async () => {
                try {
                  const { error } = await supabase.auth.signOut();
                  if (error) throw error;
                  toast.success("Sesión cerrada");
                  router.push("/");
                } catch (err: any) {
                  console.error(err);
                  toast.error(err?.message || "No se pudo cerrar la sesión");
                }
              }}
              variant="outline"
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

/* ---------- Form ---------- */

function ProfileForm({
  profile,
  onSaved,
}: {
  profile: Profile;
  onSaved: (patch: Partial<Profile>) => void;
}) {
  const supabase = getSupabaseBrowser();
  const [form, setForm] = useState({
    full_name: profile.full_name || "",
    email: profile.email || "",
    phone: profile.phone || "",
    birthday: profile.birthday || "",
  });
  const [loading, setLoading] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        full_name: form.full_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        birthday: form.birthday || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
      if (error) throw error;

      onSaved(payload);
      toast.success("Perfil actualizado");
      closeRef.current?.click();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo actualizar el perfil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <DialogClose asChild>
        <button ref={closeRef} type="button" className="hidden" />
      </DialogClose>

      <div>
        <Label>Nombre completo</Label>
        <Input
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
        />
      </div>

      <div>
        <Label>Correo</Label>
        <Input
          type="email"
          value={form.email ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>

      <div>
        <Label>Teléfono</Label>
        <Input
          value={form.phone ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
      </div>

      <div>
        <Label>Fecha de nacimiento</Label>
        <Input
          type="date"
          value={form.birthday ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar"}
        </Button>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={loading}>
            Cancelar
          </Button>
        </DialogClose>
      </div>
    </form>
  );
}

/* ---------- UI helpers ---------- */

function HoverEditableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="group relative shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base mb-2">{title}</CardTitle>
        <div className="opacity-0 group-hover:opacity-100 transition absolute top-3 right-3" />
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="sm:col-span-2">{children}</span>
    </div>
  );
}

function EditSectionDialog({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="absolute top-3 right-3 opacity-0 group-hover:opacity-100">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full  pb-6 gap-0">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="px-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}