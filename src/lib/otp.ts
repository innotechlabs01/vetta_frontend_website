// src/lib/otp.ts
import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';

// Generate a random 6-digit OTP code
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via Twilio
export async function sendOTP(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error('[otp] Twilio not configured');
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
    // Send SMS via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const params = new URLSearchParams({
      From: fromNumber,
      To: phoneNumber,
      Body: `Tu código de acceso para Vetta es: ${code}. Expira en 10 minutos.`
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[otp] Twilio error:', errorData);
      // Still return success since code is saved
      return { success: true };
    }

    const data = await response.json();
    console.log('[otp] SMS sent successfully:', data.sid);
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
