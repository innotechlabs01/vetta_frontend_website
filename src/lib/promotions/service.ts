import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { getSupabaseBrowser } from '@/utils/supabase/client'

// Types
type Promotion = any
type PromotionUse = any
type Referral = any

// Service class
export class PromotionsService {
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient
  }

  // Get active promotions for an organization
  async getActivePromotions(organizationId: string): Promise<Promotion[]> {
    const now = new Date().toISOString()
    
    const { data, error } = await this.supabase
      .from('promotions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch promotions: ${error.message}`)
    }

    return data || []
  }

  // Validate if a promotion can be applied to a cart
  async validatePromotion(
    promotionId: string, 
    organizationId: string, 
    customerId: string | null,
    cartItems: Array<{ productId: string; quantity: number; price: number }>
  ): Promise<{ valid: boolean; discountAmount: number; error?: string }> {
    // Get promotion details
    const { data: promotion, error } = await this.supabase
      .from('promotions')
      .select('*')
      .eq('id', promotionId)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      return { valid: false, discountAmount: 0, error: 'Promotion not found' }
    }

    if (!promotion) {
      return { valid: false, discountAmount: 0, error: 'Promotion not found' }
    }

    // Check if promotion is active
    const now = new Date()
    const startDate = promotion.start_date ? new Date(promotion.start_date) : null
    const endDate = promotion.end_date ? new Date(promotion.end_date) : null

    if ((startDate && now < startDate) || (endDate && now > endDate)) {
      return { valid: false, discountAmount: 0, error: 'Promotion is not active' }
    }

    // Check usage limits - use any to avoid type issues
    const promoWithUses = promotion as any
    const maxUses = promoWithUses.max_uses
    if (maxUses !== null && maxUses !== undefined) {
      const { count } = await (this.supabase as any)
        .from('promotion_uses')
        .select('*', { count: 'exact', head: true })
        .eq('promotion_id', promotionId)
        .eq('organization_id', organizationId)

      if (count && count >= maxUses) {
        return { valid: false, discountAmount: 0, error: 'Promotion usage limit reached' }
      }
    }

    // Check per-customer limits
    const maxUsesPerCustomer = promoWithUses.max_uses_per_customer
    if (customerId && maxUsesPerCustomer !== null && maxUsesPerCustomer !== undefined) {
      const { count } = await (this.supabase as any)
        .from('promotion_uses')
        .select('*', { count: 'exact', head: true })
        .eq('promotion_id', promotionId)
        .eq('organization_id', organizationId)
        .eq('customer_id', customerId)

      if (count && count >= maxUsesPerCustomer) {
        return { valid: false, discountAmount: 0, error: 'You have already used this promotion' }
      }
    }

    // Check if promotion applies to specific products/categories
    let appliesToCart = true
    const promoAny = promotion as any
    if (promoAny.applies_to_product_ids && promoAny.applies_to_product_ids.length > 0) {
      const cartProductIds = cartItems.map(item => item.productId)
      appliesToCart = cartProductIds.some(id => promoAny.applies_to_product_ids?.includes(id))
    }

    if (promoAny.applies_to_category_ids && promoAny.applies_to_category_ids.length > 0) {
      // Would need to join with products table to check categories
      // For now, we'll skip this check as it requires additional data
    }

    if (!appliesToCart) {
      return { valid: false, discountAmount: 0, error: 'Promotion does not apply to items in cart' }
    }

    // Calculate discount amount based on promotion type
    let discountAmount = 0
    let cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    switch (promoAny.type) {
      case 'percentage':
        discountAmount = cartTotal * (promoAny.discount_value / 100)
        break
      case 'fixed_amount':
        discountAmount = promoAny.discount_value
        break
      case 'bogo': {
        // Buy X Get Y free
        const requiredQuantity = promoAny.discount_value
        const freeQuantity = promoAny.bogo_get_quantity || 1
        
        // Find eligible items
        let eligibleQuantity = 0
        if (promoAny.applies_to_product_ids && promoAny.applies_to_product_ids.length > 0) {
          eligibleQuantity = cartItems
            .filter(item => promoAny.applies_to_product_ids?.includes(item.productId))
            .reduce((sum, item) => sum + item.quantity, 0)
        } else {
          eligibleQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0)
        }

        const freeItems = Math.floor(eligibleQuantity / requiredQuantity) * freeQuantity
        if (eligibleQuantity > 0) {
          discountAmount = (freeItems / eligibleQuantity) * 
            cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        }
        break
      }
      case 'volume': {
        // Volume discount
        const minQuantity = promoAny.discount_value
        
        let applicableQuantity = 0
        if (promoAny.applies_to_product_ids && promoAny.applies_to_product_ids.length > 0) {
          applicableQuantity = cartItems
            .filter(item => promoAny.applies_to_product_ids?.includes(item.productId))
            .reduce((sum, item) => sum + item.quantity, 0)
        } else {
          applicableQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0)
        }

        if (applicableQuantity >= minQuantity) {
          discountAmount = cartTotal * (promoAny.discount_value / 100)
        }
        break
      }
      default:
        return { valid: false, discountAmount: 0, error: 'Unknown promotion type' }
    }

    // Ensure discount doesn't exceed cart total
    discountAmount = Math.min(discountAmount, cartTotal)

    return { 
      valid: true, 
      discountAmount: parseFloat(discountAmount.toFixed(2)) 
    }
  }

  // Apply a promotion to a sale
  async applyPromotion(
    promotionId: string,
    organizationId: string,
    customerId: string | null,
    saleId: string,
    discountAmount: number
  ): Promise<any> {
    const { data: promotionUse, error } = await (this.supabase as any)
      .from('promotion_uses')
      .insert({
        promotion_id: promotionId,
        organization_id: organizationId,
        customer_id: customerId,
        sale_id: saleId,
        discount_amount: discountAmount
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to apply promotion: ${error.message}`)
    }

    return promotionUse
  }

  // Get promotion usage stats
  async getPromotionStats(organizationId: string): Promise<Array<{
    promotion_id: string;
    name: string;
    uses_count: number;
    total_discount: number;
  }>> {
    const { data, error } = await (this.supabase as any)
      .from('promotion_uses')
      .select(`
        promotion_id,
        promotions!inner(name),
        discount_amount
      `)
      .eq('organization_id', organizationId)

    if (error) {
      throw new Error(`Failed to fetch promotion stats: ${error.message}`)
    }

    // Group by promotion
    const statsMap = new Map<string, { 
      name: string; 
      uses_count: number; 
      total_discount: number 
    }>()

    ;(data || []).forEach((item: any) => {
      const promoId = item.promotion_id
      if (!statsMap.has(promoId)) {
        statsMap.set(promoId, {
          name: item.promotions.name,
          uses_count: 0,
          total_discount: 0
        })
      }

      const stats = statsMap.get(promoId)!
      stats.uses_count += 1
      stats.total_discount += item.discount_amount
    })

    // Convert to array
    return Array.from(statsMap.entries()).map(([promotion_id, { name, uses_count, total_discount }]) => ({
      promotion_id,
      name,
      uses_count,
      total_discount: parseFloat(total_discount.toFixed(2))
    }))
  }
}

// Lazy singleton - created on first use
let _promotionsService: PromotionsService | null = null

export function getPromotionsService(): PromotionsService {
  if (!_promotionsService) {
    _promotionsService = new PromotionsService(getSupabaseBrowser())
  }
  return _promotionsService
}

// Backwards compatibility
export const promotionsService = {
  get getActivePromotions() { return getPromotionsService().getActivePromotions.bind(getPromotionsService()) },
  get validatePromotion() { return getPromotionsService().validatePromotion.bind(getPromotionsService()) },
  get applyPromotion() { return getPromotionsService().applyPromotion.bind(getPromotionsService()) },
  get getPromotionStats() { return getPromotionsService().getPromotionStats.bind(getPromotionsService()) },
}
