-- Add location_id to promotions table for sucursal-specific promotions
ALTER TABLE IF EXISTS public.promotions 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE;

-- Add comment explaining the column
COMMENT ON COLUMN public.promotions.location_id IS 'NULL = applies to all locations in organization, specific UUID = only applies to that location/sucursal';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_promotions_location ON public.promotions(location_id);

-- Drop the old product/category arrays (promotions should not be tied to specific products)
-- Instead, they should be general or based on categories
ALTER TABLE IF EXISTS public.promotions 
DROP COLUMN IF EXISTS applies_to_product_ids,
DROP COLUMN IF EXISTS applies_to_category_ids;

-- Add a new column for promotion scope
ALTER TABLE IF EXISTS public.promotions 
ADD COLUMN IF NOT EXISTS applies_to_all BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS applies_to_category_ids UUID[]; -- Optional: limit to specific categories

-- Update RLS policy to include location check
DROP POLICY IF EXISTS "Allow org members to manage promotions" ON public.promotions;

CREATE POLICY "Allow org members to manage promotions"
  ON public.promotions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = promotions.organization_id
      AND m.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.location_members lm
      WHERE lm.location_id = promotions.location_id
      AND lm.user_id = auth.uid()
      AND lm.organization_id = promotions.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = promotions.organization_id
      AND m.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.location_members lm
      WHERE lm.location_id = promotions.location_id
      AND lm.user_id = auth.uid()
      AND lm.organization_id = promotions.organization_id
    )
  );
