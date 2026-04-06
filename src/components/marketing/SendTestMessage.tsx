// src/components/marketing/SendTestMessage.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SendTestMessageProps {
  onSend: (options: any) => Promise<any>;
  orgId: string;
}

export function SendTestMessage({ onSend, orgId }: SendTestMessageProps) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    
    if (!phone) {
      setResult({ success: false, message: "Por favor ingresa un número de teléfono" });
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      // Send test message using Sent.dm
      const response = await onSend({
        to: [phone],
        template: {
          id: "test-template",
          name: "Test Message",
          parameters: {
            message: "This is a test message from your Recompry organization"
          }
        },
        channel: "sms"
      });

      if (response.success) {
        setResult({ 
          success: true, 
          message: `Mensaje enviado exitosamente! ID: ${response.data.id}` 
        });
      } else {
        setResult({ 
          success: false, 
          message: response.error?.message || "Error al enviar mensaje" 
        });
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: error instanceof Error ? error.message : "Error desconocido" 
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enviar Mensaje de Prueba</CardTitle>
        <CardDescription>
          Envía un mensaje de prueba usando Sent.dm (Sandbox mode)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSend} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-phone">Número de teléfono</Label>
            <Input
              id="test-phone"
              type="tel"
              placeholder="+1234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          
          <Button type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar Mensaje"}
          </Button>

          {result && (
            <div className={`p-3 rounded-lg ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
              {result.message}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}