import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Tipos para TypeScript
export type Campaign = {
  id: string;
  tenant_id: string;
  name: string;
  goal: 'awareness' | 'engagement' | 'conversion' | 'retention' | 'birthday';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  audience_filters: any;
  estimated_audience: number;
  offer_id: string | null;
  message_template: string;
  channels: ('whatsapp' | 'sms' | 'email')[];
  scheduled_at: string | null;
  is_automated: boolean;
  automation_config: any;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
  total_converted: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}

// Alias hacia el singleton para evitar instancias extra en componentes cliente
export const createClient = () => getSupabaseBrowser();
