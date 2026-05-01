import { useState, useCallback } from 'react'
import { promotionsService } from '@/lib/promotions/service'
import { referralsService } from '@/lib/referrals/service'
import { toast } from 'sonner'

export function usePromotions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validate a promotion for a cart
  const validatePromotion = useCallback(async (
    promotionId: string,
    organizationId: string,
    customerId: string | null,
    cartItems: Array<{ productId: string; quantity: number; price: number }>
  ) => {
    setLoading(true)
    setError(null)
    try {
      const result = await promotionsService.validatePromotion(
        promotionId,
        organizationId,
        customerId,
        cartItems
      )
      return result
    } catch (err: any) {
      setError(err?.message || 'Failed to validate promotion')
      return { valid: false, discountAmount: 0, error: err?.message || 'Failed to validate promotion' }
    } finally {
      setLoading(false)
    }
  }, [])

  // Apply a promotion to a sale
  const applyPromotion = useCallback(async (
    promotionId: string,
    organizationId: string,
    customerId: string | null,
    saleId: string,
    discountAmount: number
  ) => {
    setLoading(true)
    setError(null)
    try {
      const promotionUse = await promotionsService.applyPromotion(
        promotionId,
        organizationId,
        customerId,
        saleId,
        discountAmount
      )
      return promotionUse
    } catch (err: any) {
      setError(err?.message || 'Failed to apply promotion')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Validate a referral code
  const validateReferralCode = useCallback(async (
    organizationId: string,
    referralCode: string
  ) => {
    setLoading(true)
    setError(null)
    try {
      const result = await referralsService.validateReferralCode(
        organizationId,
        referralCode
      )
      return result
    } catch (err: any) {
      setError(err?.message || 'Failed to validate referral code')
      return { valid: false, error: err?.message || 'Failed to validate referral code' }
    } finally {
      setLoading(false)
    }
  }, [])

  // Complete a referral
  const completeReferral = useCallback(async (
    referralId: string,
    refereeId: string | null = null,
    refereeEmail: string | null = null
  ) => {
    setLoading(true)
    setError(null)
    try {
      const referral = await referralsService.completeReferral(
        referralId,
        refereeId,
        refereeEmail
      )
      return referral
    } catch (err: any) {
      setError(err?.message || 'Failed to complete referral')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Grant referral rewards
  const grantReferralRewards = useCallback(async (
    referralId: string
  ) => {
    setLoading(true)
    setError(null)
    try {
      const result = await referralsService.grantReferralRewards(referralId)
      return result
    } catch (err: any) {
      setError(err?.message || 'Failed to grant referral rewards')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    validatePromotion,
    applyPromotion,
    validateReferralCode,
    completeReferral,
    grantReferralRewards
  }
}