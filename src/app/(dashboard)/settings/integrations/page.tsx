"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { useEnvironment } from "@/context/EnvironmentContext";

const integrations = [
  {
    id: "alegra",
    name: "Alegra",
    description: "Facturacion electronica y contabilidad para tu negocio.",
    logo: "/brands/alegra.webp",
  },
  {
    id: "siigo",
    name: "Siigo",
    description: "Integracion contable para sincronizar ventas y catalogo.",
    logo: "/brands/siigo.webp",
  },
  {
    id: "wompi",
    name: "Wompi",
    description: "Pasarela de pagos para ventas en linea.",
    logo: "/brands/wompi.webp",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Mensajeria para notificaciones y atencion al cliente.",
    logo: "/brands/whatsapp.webp",
  },
];

type IntegrationRow = {
  provider: string;
  auth_method: "api_token" | "oauth";
  credentials_metadata: Record<string, string> | null;
};

export default function IntegrationsPage() {
  const { org } = useEnvironment();
  const supabase = getSupabaseBrowser();
  const orgId = org?.id ?? null;

  const [alegraOpen, setAlegraOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alegraUser, setAlegraUser] = useState("");
  const [alegraToken, setAlegraToken] = useState("");
  const [siigoOpen, setSiigoOpen] = useState(false);
  const [siigoUser, setSiigoUser] = useState("");
  const [siigoToken, setSiigoToken] = useState("");
  const [wompiOpen, setWompiOpen] = useState(false);
  const [wompiPrivateKey, setWompiPrivateKey] = useState("");
  const [wompiIntegritySecret, setWompiIntegritySecret] = useState("");
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [whatsappAccessToken, setWhatsappAccessToken] = useState("");
  const [integrationsMap, setIntegrationsMap] = useState<Record<string, IntegrationRow>>({});

  const canSaveAlegra = useMemo(
    () => Boolean(alegraUser.trim() && alegraToken.trim()),
    [alegraUser, alegraToken],
  );
  const canSaveSiigo = useMemo(
    () => Boolean(siigoUser.trim() && siigoToken.trim()),
    [siigoUser, siigoToken],
  );
  const canSaveWompi = useMemo(
    () => Boolean(wompiPrivateKey.trim() && wompiIntegritySecret.trim()),
    [wompiPrivateKey, wompiIntegritySecret],
  );
  const canSaveWhatsapp = useMemo(
    () => Boolean(whatsappPhoneNumberId.trim() && whatsappAccessToken.trim()),
    [whatsappPhoneNumberId, whatsappAccessToken],
  );

  useEffect(() => {
    if (!orgId) return;
    let active = true;

    const fetchIntegrations = async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("provider,auth_method,credentials_metadata")
        .eq("organization_id", orgId);

      if (!active) return;
      if (error) {
        toast.error("No se pudieron cargar las integraciones.");
        return;
      }

      const nextMap: Record<string, IntegrationRow> = {};
      (data ?? []).forEach((row) => {
        nextMap[row.provider] = row as IntegrationRow;
      });
      setIntegrationsMap(nextMap);
    };

    fetchIntegrations();

    return () => {
      active = false;
    };
  }, [orgId, supabase]);

  function handleConnect(providerId: string) {
    if (providerId === "alegra") {
      const existing = integrationsMap.alegra;
      setAlegraUser(existing?.credentials_metadata?.username ?? "");
      setAlegraToken("");
      setAlegraOpen(true);
      return;
    }
    if (providerId === "siigo") {
      const existing = integrationsMap.siigo;
      setSiigoUser(existing?.credentials_metadata?.username ?? "");
      setSiigoToken("");
      setSiigoOpen(true);
      return;
    }
    if (providerId === "wompi") {
      setWompiPrivateKey("");
      setWompiIntegritySecret("");
      setWompiOpen(true);
      return;
    }
    if (providerId === "whatsapp") {
      const existing = integrationsMap.whatsapp;
      setWhatsappPhoneNumberId(existing?.credentials_metadata?.phone_number_id ?? "");
      setWhatsappAccessToken("");
      setWhatsappOpen(true);
      return;
    }
    toast("Integracion disponible pronto.");
  }

  async function handleSaveAlegra() {
    if (!orgId) {
      toast.error("No hay organizacion activa.");
      return;
    }
    if (!canSaveAlegra) {
      toast.error("Completa usuario y API token.");
      return;
    }

    try {
      setSaving(true);
      const encryptedCredentials = JSON.stringify({
        username: alegraUser.trim(),
        api_token: alegraToken.trim(),
      });

      const { data, error } = await supabase
        .from("integrations")
        .upsert(
          {
            organization_id: orgId,
            provider: "alegra",
            auth_method: "api_token",
            encrypted_credentials: encryptedCredentials,
            credentials_metadata: { username: alegraUser.trim() },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,provider" },
        )
        .select("provider,auth_method,credentials_metadata")
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setIntegrationsMap((prev) => ({
          ...prev,
          [data.provider]: data as IntegrationRow,
        }));
      }

      toast.success("Integracion guardada.");
      setAlegraOpen(false);
      setAlegraUser("");
      setAlegraToken("");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar la integracion.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSiigo() {
    if (!orgId) {
      toast.error("No hay organizacion activa.");
      return;
    }
    if (!canSaveSiigo) {
      toast.error("Completa usuario y token.");
      return;
    }

    try {
      setSaving(true);
      const encryptedCredentials = JSON.stringify({
        username: siigoUser.trim(),
        token: siigoToken.trim(),
      });

      const { data, error } = await supabase
        .from("integrations")
        .upsert(
          {
            organization_id: orgId,
            provider: "siigo",
            auth_method: "api_token",
            encrypted_credentials: encryptedCredentials,
            credentials_metadata: { username: siigoUser.trim() },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,provider" },
        )
        .select("provider,auth_method,credentials_metadata")
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setIntegrationsMap((prev) => ({
          ...prev,
          [data.provider]: data as IntegrationRow,
        }));
      }

      toast.success("Integracion guardada.");
      setSiigoOpen(false);
      setSiigoUser("");
      setSiigoToken("");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar la integracion.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveWompi() {
    if (!orgId) {
      toast.error("No hay organizacion activa.");
      return;
    }
    if (!canSaveWompi) {
      toast.error("Completa private key e integrity secret.");
      return;
    }

    try {
      setSaving(true);
      const encryptedCredentials = JSON.stringify({
        private_key: wompiPrivateKey.trim(),
        integrity_secret: wompiIntegritySecret.trim(),
      });

      const { data, error } = await supabase
        .from("integrations")
        .upsert(
          {
            organization_id: orgId,
            provider: "wompi",
            auth_method: "api_token",
            encrypted_credentials: encryptedCredentials,
            credentials_metadata: {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,provider" },
        )
        .select("provider,auth_method,credentials_metadata")
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setIntegrationsMap((prev) => ({
          ...prev,
          [data.provider]: data as IntegrationRow,
        }));
      }

      toast.success("Integracion guardada.");
      setWompiOpen(false);
      setWompiPrivateKey("");
      setWompiIntegritySecret("");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar la integracion.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveWhatsapp() {
    if (!orgId) {
      toast.error("No hay organizacion activa.");
      return;
    }
    if (!canSaveWhatsapp) {
      toast.error("Completa phone number id y access token.");
      return;
    }

    try {
      setSaving(true);
      const encryptedCredentials = JSON.stringify({
        phone_number_id: whatsappPhoneNumberId.trim(),
        access_token: whatsappAccessToken.trim(),
      });

      const { data, error } = await supabase
        .from("integrations")
        .upsert(
          {
            organization_id: orgId,
            provider: "whatsapp",
            auth_method: "api_token",
            encrypted_credentials: encryptedCredentials,
            credentials_metadata: { phone_number_id: whatsappPhoneNumberId.trim() },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,provider" },
        )
        .select("provider,auth_method,credentials_metadata")
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setIntegrationsMap((prev) => ({
          ...prev,
          [data.provider]: data as IntegrationRow,
        }));
      }

      toast.success("Integracion guardada.");
      setWhatsappOpen(false);
      setWhatsappPhoneNumberId("");
      setWhatsappAccessToken("");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar la integracion.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-6 space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Integraciones</h1>
        <p className="text-sm text-muted-foreground">
          Estas integraciones estan disponibles por defecto. Por ahora solo incluyen el boton de conectar.
        </p>
      </div>

      <div className="space-y-4">
        {integrations.map((integration) => {
          const isConnected = Boolean(integrationsMap[integration.id]);
          return (
            <Card key={integration.id} className="shadow-sm">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border bg-white overflow-hidden">
                    <Image
                      src={integration.logo}
                      alt={integration.name}
                      width={300}
                      height={300}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                    {isConnected ? (
                      <p className="text-xs font-medium text-emerald-600">Conectada</p>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnect(integration.id)}
                >
                  {isConnected ? "Configurar" : "Conectar"}
                </Button>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Dialog open={alegraOpen} onOpenChange={(open) => (open ? null : setAlegraOpen(false))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conectar Alegra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-6">
            <p className="text-sm text-muted-foreground">
              Ingresa el usuario y el API token de tu cuenta de Alegra.
            </p>
            <div className="space-y-2">
              <Label htmlFor="alegra-user">Usuario</Label>
              <Input
                id="alegra-user"
                value={alegraUser}
                onChange={(event) => setAlegraUser(event.target.value)}
                placeholder="usuario@alegra.com"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alegra-token">API token</Label>
              <Input
                id="alegra-token"
                value={alegraToken}
                onChange={(event) => setAlegraToken(event.target.value)}
                placeholder="token"
                type="password"
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAlegraOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveAlegra} disabled={saving || !canSaveAlegra}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Guardar conexion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={siigoOpen} onOpenChange={(open) => (open ? null : setSiigoOpen(false))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conectar Siigo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-6">
            <p className="text-sm text-muted-foreground">
              Ingresa el usuario y token de tu cuenta de Siigo.
            </p>
            <div className="space-y-2">
              <Label htmlFor="siigo-user">Usuario</Label>
              <Input
                id="siigo-user"
                value={siigoUser}
                onChange={(event) => setSiigoUser(event.target.value)}
                placeholder="usuario@siigo.com"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siigo-token">Token</Label>
              <Input
                id="siigo-token"
                value={siigoToken}
                onChange={(event) => setSiigoToken(event.target.value)}
                placeholder="token"
                type="password"
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSiigoOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSiigo} disabled={saving || !canSaveSiigo}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Guardar conexion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={wompiOpen} onOpenChange={(open) => (open ? null : setWompiOpen(false))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conectar Wompi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-6">
            <p className="text-sm text-muted-foreground">
              Ingresa el private key y el integrity secret de Wompi.
            </p>
            <div className="space-y-2">
              <Label htmlFor="wompi-private-key">Private key</Label>
              <Input
                id="wompi-private-key"
                value={wompiPrivateKey}
                onChange={(event) => setWompiPrivateKey(event.target.value)}
                placeholder="private_key"
                type="password"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wompi-integrity-secret">Integrity secret</Label>
              <Input
                id="wompi-integrity-secret"
                value={wompiIntegritySecret}
                onChange={(event) => setWompiIntegritySecret(event.target.value)}
                placeholder="integrity_secret"
                type="password"
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setWompiOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveWompi} disabled={saving || !canSaveWompi}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Guardar conexion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={whatsappOpen} onOpenChange={(open) => (open ? null : setWhatsappOpen(false))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-6">
            <p className="text-sm text-muted-foreground">
              Ingresa el phone number id y el access token de WhatsApp.
            </p>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone-number-id">Phone number id</Label>
              <Input
                id="whatsapp-phone-number-id"
                value={whatsappPhoneNumberId}
                onChange={(event) => setWhatsappPhoneNumberId(event.target.value)}
                placeholder="1234567890"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-access-token">Access token</Label>
              <Input
                id="whatsapp-access-token"
                value={whatsappAccessToken}
                onChange={(event) => setWhatsappAccessToken(event.target.value)}
                placeholder="access_token"
                type="password"
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setWhatsappOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveWhatsapp} disabled={saving || !canSaveWhatsapp}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Guardar conexion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
