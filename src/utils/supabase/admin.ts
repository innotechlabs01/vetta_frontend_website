// utils/supabase/server-admin.ts
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en el .env");
  }
  if (!serviceRoleKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el .env");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
