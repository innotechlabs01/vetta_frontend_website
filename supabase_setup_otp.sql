-- Crear tabla verification_codes para OTP
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login',
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_verification_codes_phone ON verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Política para que cualquier usuario pueda insertar códigos
CREATE POLICY "Allow insert verification codes" ON verification_codes
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Política para que cualquier usuario pueda buscar códigos (necesario para verificación)
CREATE POLICY "Allow select verification codes" ON verification_codes
  FOR SELECT TO anon, authenticated
  USING (true);

-- Política para queany usuario pueda actualizar (marcar como verificado)
CREATE POLICY "Allow update verification codes" ON verification_codes
  FOR UPDATE TO anon, authenticated
  USING (true);