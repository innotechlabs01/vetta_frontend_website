// src/lib/otp.ts
import { createClient } from '@/utils/supabase/server';

// Generate a random 6-digit OTP code
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Save OTP to database (actual sending is done via Sent.dm in actions.ts)
export async function sendOTP(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  const code = generateOTP();
  const supabase = await createClient();

  // Save verification code to database
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const { error: insertError } = await supabase
    .from('verification_codes')
    .insert({
      phone: phoneNumber,
      code: code,
      purpose: 'login',
      expires_at: expiresAt.toISOString()
    });

  if (insertError) {
    console.error('[otp] Error saving code:', insertError);
    return { success: false, error: 'Failed to generate code' };
  }

  console.log('[otp] OTP saved to database:', { phone: phoneNumber, code });
  return { success: true };
}

// Verify OTP code
export async function verifyOTP(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('phone', phoneNumber)
    .eq('code', code)
    .eq('purpose', 'login')
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .single();

  if (error || !data) {
    console.error('[otp] Invalid or expired code:', error);
    return { success: false, error: 'Código inválido o expirado' };
  }

  // Mark as verified
  await supabase
    .from('verification_codes')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', data.id);

  return { success: true };
}

// Clean up old verification codes
export async function cleanupOldCodes(): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('verification_codes')
    .delete()
    .lt('expires_at', new Date().toISOString());
}
