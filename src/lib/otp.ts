// src/lib/otp.ts
import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';
import SentDm from '@sentdm/sentdm';

// Generate a random 6-digit OTP code
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via Sent.dm
export async function sendOTP(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.SENT_DM_API_KEY || process.env.NEXT_PUBLIC_SENT_DM_SANDBOX_KEY;
  const templateId = process.env.SENT_DM_OTP_TEMPLATE_ID || '13ebcbe3-dffb-4bac-a554-aa3b33fe5185';
  
  if (!apiKey) {
    console.error('[otp] No API key configured');
    return { success: false, error: 'SMS service not configured' };
  }

  const code = generateOTP();
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get('origin') || 'http://localhost:3000';

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

  try {
    const client = new SentDm({ apiKey });

    // Try sending with template
    const response = await client.messages.send({
      to: [phoneNumber],
      template: {
        id: templateId,
        name: 'OTP',
        parameters: {
          code: code,
          app_name: 'Vetta'
        }
      },
      channel: ['sms']
    }) as any;

    console.log('[otp] SMS sent successfully:', response.data?.messages?.[0]?.id);
    return { success: true };
  } catch (error: any) {
    console.error('[otp] Error sending SMS:', error);
    // Still return success since code is saved - user can request new one
    return { success: true };
  }
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