-- Tabla para promociones/descuentos
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'bogo', 'volume')),
  discount_value DECIMAL(10,2) NOT NULL, -- Para percentage: valor %, para fixed_amount: monto, para bogo: cantidad requerida, para volume: cantidad mínima
  bogo_get_quantity INTEGER, -- Para promociones tipo "compra X lleva Y"
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER, -- Límite total de usos
  max_uses_per_customer INTEGER DEFAULT 1, -- Límite por cliente
  applies_to_product_ids UUID[], -- NULL = aplica a todos los productos
  applies_to_category_ids UUID[], -- NULL = aplica a todas las categorías
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para tracking de usos de promociones
CREATE TABLE IF NOT EXISTS public.promotion_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id), -- Puede ser NULL para usuarios anónimos
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL, -- Vinculado a la venta donde se aplicó
  discount_amount DECIMAL(10,2) NOT NULL, -- Monto real descontado
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para programa de referidos
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  referrer_id UUID REFERENCES auth.users(id) NOT NULL, -- Usuario que refiere
  referee_id UUID REFERENCES auth.users(id), -- Usuario referido (NULL si aún no se registra)
  referee_email VARCHAR(255), -- Email del referido para tracking antes de registro
  referral_code VARCHAR(50) UNIQUE NOT NULL, -- Código único para compartir
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  referrer_reward_granted BOOLEAN DEFAULT FALSE,
  referee_reward_granted BOOLEAN DEFAULT FALSE,
  reward_amount DECIMAL(10,2) NOT NULL, -- Crédito/puntos otorgado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_promotions_organization ON promotions(organization_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_promotion_uses_promotion ON promotion_uses(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_uses_customer ON promotion_uses(customer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Función helper para verificar membresía en organización (reutilizando la existente)
DROP FUNCTION IF EXISTS public.is_member_of_org(p_org UUID);
CREATE OR REPLACE FUNCTION public.is_member_of_org(p_org UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $function$
  SELECT EXISTS(
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = p_org
      AND m.user_id = auth.uid()
  );
$function$;

-- Políticas RLS para promotions
DROP POLICY IF EXISTS "Allow org members to manage promotions" ON public.promotions;
DROP POLICY IF EXISTS "Allow public read access to active promotions" ON public.promotions;

CREATE POLICY "Allow org members to manage promotions"
  ON public.promotions
  FOR ALL
  TO authenticated
  USING (is_member_of_org(organization_id))
  WITH CHECK (is_member_of_org(organization_id));

CREATE POLICY "Allow public read access to active promotions"
  ON public.promotions
  FOR SELECT
  TO anon
  USING (is_active = TRUE AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()));

-- Políticas RLS para promotion_uses
DROP POLICY IF EXISTS "Allow org members to manage promotion uses" ON public.promotion_uses;
DROP POLICY IF EXISTS "Allow public insert promotion uses" ON public.promotion_uses;

CREATE POLICY "Allow org members to manage promotion uses"
  ON public.promotion_uses
  FOR ALL
  TO authenticated
  USING (is_member_of_org(organization_id))
  WITH CHECK (is_member_of_org(organization_id));

CREATE POLICY "Allow public insert promotion uses"
  ON public.promotion_uses
  FOR INSERT
  TO anon
  WITH CHECK (TRUE);

-- Políticas RLS para referrals
DROP POLICY IF EXISTS "Allow org members to manage referrals" ON public.referrals;
DROP POLICY IF EXISTS "Allow public insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "Allow public select own referrals" ON public.referrals;

CREATE POLICY "Allow org members to manage referrals"
  ON public.referrals
  FOR ALL
  TO authenticated
  USING (is_member_of_org(organization_id))
  WITH CHECK (is_member_of_org(organization_id));

CREATE POLICY "Allow public insert referrals"
  ON public.referrals
  FOR INSERT
  TO anon
  WITH CHECK (TRUE);

CREATE POLICY "Allow public select own referrals"
  ON public.referrals
  FOR SELECT
  TO anon
  USING (referee_email = current_setting('request.jwt.claims', TRUE)::json->>'email');
