// src/components/marketing/MessageHistory.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MessageHistoryProps {
  orgId: string;
  limit?: number;
}

interface MessageItem {
  id: string;
  to: string;
  status: string;
  channel: string;
  created_at: string;
  error?: string;
}

export function MessageHistory({ orgId, limit = 10 }: MessageHistoryProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessageHistory();
  }, [orgId, limit]);

  async function loadMessageHistory() {
    if (!orgId) return;

    try {
      setLoading(true);
      // In a real implementation, this would fetch from your database
      // For now, simulate with mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockMessages: MessageItem[] = [
        { id: "1", to: "+1234567890", status: "delivered", channel: "sms", created_at: new Date().toISOString() },
        { id: "2", to: "+0987654321", status: "sent", channel: "whatsapp", created_at: new Date(Date.now() - 3600000).toISOString() },
      ];
      
      setMessages(mockMessages);
    } catch (error) {
      console.error("Error loading message history:", error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      delivered: "bg-green-100 text-green-800",
      sent: "bg-blue-100 text-blue-800",
      failed: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-gray-500">Cargando historial...</p>
        </CardContent>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-gray-500">No hay mensajes enviados todavía</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Mensajes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex flex-col">
                <span className="font-medium">{msg.to}</span>
                <span className="text-sm text-gray-500">
                  {msg.channel.toUpperCase()} • {formatDate(msg.created_at)}
                </span>
              </div>
              {getStatusBadge(msg.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}