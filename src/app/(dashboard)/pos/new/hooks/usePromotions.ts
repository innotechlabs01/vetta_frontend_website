import { useState, useCallback } from 'react'
import { usePromotions } from '@/hooks/usePromotions'
import { useEnvironment } from '@/context/EnvironmentContext'

export function usePosPromotions() {
  const { org } = useEnvironment()
  const organizationId = org?.id ?? null
  const { 
    validatePromotion, 
    applyPromotion,
    validateReferralCode,
    completeReferral,
    grantReferralRewards,
    loading: promoLoading,
    error: promoError
  } = usePromotions()

  // Promotion state for the current cart
  const [appliedPromotion, setAppliedPromotion] = useState<{
    id: string;
    name: string;
    discountAmount: number;
    type: string;
  } | null>(null)
  
  const [promotionCode, setPromotionCode] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [referralRewardApplied, setReferralRewardApplied] = useState(false)
  const [validatingPromotion, setValidatingPromotion] = useState(false)
  const [validatingReferral, setValidatingReferral] = useState(false)
  const [promotionError, setPromotionError] = useState<string | null>(null)
  const [referralError, setReferralError] = useState<string | null>(null)

  // Validate a promotion code
  const handleValidatePromotion = useCallback(async (
    cartItems: Array<{ productId: string; quantity: number; price: number }>,
    customerId: string | null = null
  ) => {
    if (!promotionCode.trim() || !organizationId) {
      setPromotionError('Please enter a promotion code')
      return false
    }

    setValidatingPromotion(true)
    setPromotionError(null)
    
    try {
      // First, we need to get the promotion ID from the code
      // In a real implementation, we'd have a lookup table or API endpoint
      // For now, we'll simulate by treating the code as the promotion ID
      // This is a simplification - in reality you'd have a promotion_codes table
      
      const result = await validatePromotion(
        promotionCode.trim(), // treating code as ID for simplicity
        organizationId,
        customerId,
        cartItems
      )

      if (result.valid) {
        // Find promotion details to display
        // In a real app, you'd fetch the promotion details
        setAppliedPromotion({
          id: promotionCode.trim(),
          name: `Promoción ${promotionCode.trim()}`,
          discountAmount: result.discountAmount,
          type: 'percentage' // This would come from the promotion data
        })
        setPromotionError(null)
        return true
      } else {
        setAppliedPromotion(null)
        setPromotionError(result.error || 'Invalid promotion code')
        return false
      }
    } catch (err: any) {
      setAppliedPromotion(null)
      setPromotionError(err?.message || 'Failed to validate promotion')
      return false
    } finally {
      setValidatingPromotion(false)
    }
  }, [organizationId, promotionCode, validatePromotion])

  // Apply the validated promotion to a sale
  const handleApplyPromotion = useCallback(async (
    saleId: string,
    customerId: string | null = null
  ) => {
    if (!appliedPromotion || !organizationId) {
      throw new Error('No valid promotion to apply')
    }

    try {
      const promotionUse = await applyPromotion(
        appliedPromotion.id,
        organizationId,
        customerId,
        saleId,
        appliedPromotion.discountAmount
      )
      return promotionUse
    } catch (err: any) {
      throw err
    }
  }, [appliedPromotion, organizationId, applyPromotion])

  // Clear applied promotion
  const clearAppliedPromotion = useCallback(() => {
    setAppliedPromotion(null)
    setPromotionCode('')
    setPromotionError(null)
  }, [])

  // Validate a referral code
  const handleValidateReferral = useCallback(async () => {
    if (!referralCode.trim() || !organizationId) {
      setReferralError('Please enter a referral code')
      return false
    }

    setValidatingReferral(true)
    setReferralError(null)
    
    try {
      const result = await validateReferralCode(
        organizationId,
        referralCode.trim()
      )

      if (result.valid) {
        setReferralError(null)
        return true
      } else {
        setReferralError(result.error || 'Invalid referral code')
        return false
      }
    } catch (err: any) {
      setReferralError(err?.message || 'Failed to validate referral code')
      return false
    } finally {
      setValidatingReferral(false)
    }
  }, [organizationId, referralCode, validateReferralCode])

   // Apply referral rewards (when a referred user makes their first purchase)
   const handleApplyReferralRewards = useCallback(async (
    referralId: string,
    customerId: string | null = null
  ) => {
    if (!referralId || !organizationId) {
      throw new Error('Invalid referral or organization')
    }

    try {
      // First complete the referral (mark as used)
      const completedReferral = await completeReferral(
        referralId,
        customerId,
        null // email would come from user data in real implementation
      )
      
      // Then grant rewards to both parties
      const rewardsResult = await grantReferralRewards(referralId)
      
      // Mark that referral reward has been applied to prevent double application
      setReferralRewardApplied(true)
      
      return { completedReferral, rewardsResult }
    } catch (err: any) {
      throw err
    }
  }, [organizationId, completeReferral, grantReferralRewards, setReferralRewardApplied])

  return {
    // State
    appliedPromotion,
    promotionCode,
    setPromotionCode,
    referralCode,
    setReferralCode,
    referralRewardApplied,
    setReferralRewardApplied,
    validatingPromotion,
    validatingReferral,
    promotionError,
    referralError,
    
    // Actions
    handleValidatePromotion,
    handleApplyPromotion,
    clearAppliedPromotion,
    handleValidateReferral,
    handleApplyReferralRewards
  }
}