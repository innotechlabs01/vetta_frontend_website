-- ============================================================================
-- MIGRACIONES CRÍTICAS - SISTEMA Vetta
-- Fecha: 6 de Marzo de 2025
-- ============================================================================
-- 
-- FASE 0: MIGRACIONES PARA ARREGLAR ERRORES CRÍTICOS DE BD
-- Ejecutar INMEDIATAMENTE antes de cualquier otra operación
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- MIGRACIÓN 1: Agregar shift_id a tabla sales
-- ============================================================================
-- Problema: El código intenta usar sales.shift_id que no existe
-- Ubicación del error: src/app/(dashboard)/sales/page.tsx líneas 970, 1066
-- Impacto: Módulo Sales completamente roto

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.cash_shifts(id) ON DELETE SET NULL;

-- Índice simple para queries por shift
CREATE INDEX IF NOT EXISTS idx_sales_shift_id 
ON public.sales(shift_id);

-- Índice compuesto para queries comunes (org + shift)
CREATE INDEX IF NOT EXISTS idx_sales_org_shift 
ON public.sales(organization_id, shift_id);

-- Índice para reportes por estado en turno
CREATE INDEX IF NOT EXISTS idx_sales_shift_status 
ON public.sales(shift_id, status);

-- ============================================================================
-- MIGRACIÓN 2: Agregar daily_limit_usd a tabla customers
-- ============================================================================
-- Problema: El código intenta usar customers.daily_limit_usd que no existe
-- Ubicación del error: 11+ ubicaciones en código
-- Impacto: Módulo Customers inoperativo

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS daily_limit_usd numeric(12,2) DEFAULT 0;

-- Constraint para asegurar valores positivos
ALTER TABLE public.customers
ADD CONSTRAINT daily_limit_usd_non_negative 
CHECK (daily_limit_usd >= 0);

-- Índice para búsquedas con límite
CREATE INDEX IF NOT EXISTS idx_customers_daily_limit 
ON public.customers(daily_limit_usd);

-- Índice compuesto para filtros por org y límite
CREATE INDEX IF NOT EXISTS idx_customers_org_limit 
ON public.customers(organization_id, daily_limit_usd);

-- Índice para reporte diario de gastos por cliente
CREATE INDEX IF NOT EXISTS idx_customers_org_limit_active 
ON public.customers(organization_id, daily_limit_usd) 
WHERE daily_limit_usd > 0;

-- ============================================================================
-- OPTIMIZACIONES ADICIONALES (Recomendadas)
-- ============================================================================

-- Agregar columna para rastrear balance de crédito actual
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS current_credit_balance numeric(12,2) DEFAULT 0;

-- Índice para reporte de clientes con crédito
CREATE INDEX IF NOT EXISTS idx_customers_credit_balance 
ON public.customers(organization_id, current_credit_balance) 
WHERE current_credit_balance != 0;

-- Agregar columna para último acceso
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS last_limit_check_at timestamptz DEFAULT now();

-- ============================================================================
-- VERIFICACIONES POST-MIGRACIÓN
-- ============================================================================

-- Verificar que las columnas fueron creadas correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'sales' AND column_name = 'shift_id'
UNION ALL
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'customers' AND column_name IN ('daily_limit_usd', 'current_credit_balance');

-- Verificar que los índices fueron creados
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename IN ('sales', 'customers') 
AND indexname LIKE 'idx_%';

COMMIT;

-- ============================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================================================
--
-- 1. EJECUTAR INMEDIATAMENTE:
--    Estas migraciones son CRÍTICAS para que el sistema funcione
--
-- 2. PUNTO DE VERIFICACIÓN:
--    Después de ejecutar, probar:
--    - Cargar página de Ventas (debe cargar sin error)
--    - Crear nuevo cliente (debe poder guardar daily_limit_usd)
--    - Crear nueva venta en POS (debe guardar shift_id)
--
-- 3. ROLLBACK (si es necesario):
--    ALTER TABLE public.sales DROP COLUMN IF EXISTS shift_id;
--    ALTER TABLE public.customers DROP COLUMN IF EXISTS daily_limit_usd;
--    DROP INDEX IF EXISTS idx_sales_shift_id;
--    DROP INDEX IF EXISTS idx_customers_daily_limit;
--
-- 4. PRÓXIMOS PASOS:
--    - Cambiar org_id cookie a httpOnly: true
--    - Remover MOCK_USER_ID de rutas
--    - Implementar validación server-side para totales financieros
--
-- ============================================================================
