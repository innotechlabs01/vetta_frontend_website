import { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/utils/supabase/client'

// Types
type Referral = {
  id: string
  organization_id: string
  referrer_id: string
  referral_code: string
  reward_amount: number
  expires_at: string | null
  status: 'pending' | 'completed' | 'expired'
  completed_at: string | null
  referee_id: string | null
  referee_email: string | null
  referrer_reward_granted: boolean
  referee_reward_granted: boolean
  created_at: string | null
  updated_at: string | null
}

// Service class
export class ReferralsService {
  private supabase: SupabaseClient<any>

  constructor(supabaseClient: SupabaseClient<any>) {
    this.supabase = supabaseClient
  }

  // Generate a referral code for a user
  async generateReferralCode(
    organizationId: string,
    referrerId: string,
    rewardAmount: number,
    expiresInDays: number = 30
  ): Promise<Referral> {
    // Check if user already has an active referral code
    const { data: existingReferral, error: checkError } = await this.supabase
      .from('referrals')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('referrer_id', referrerId)
      .eq('status', 'pending')
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
      throw new Error(`Failed to check existing referral: ${checkError.message}`)
    }

    // If there's an active referral, return it
    if (existingReferral) {
      return existingReferral
    }

    // Generate a unique referral code
    let referralCode = ''
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    while (!isUnique && attempts < maxAttempts) {
      referralCode = this.generateCode(8)
      const { data: existingCode, error: codeError } = await this.supabase
        .from('referrals')
        .select('id')
        .eq('referral_code', referralCode)
        .single()

      if (codeError && codeError.code === 'PGRST116') {
        isUnique = true // No existing code found
      } else if (codeError) {
        throw new Error(`Failed to check referral code uniqueness: ${codeError.message}`)
      }
      
      attempts++
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique referral code after multiple attempts')
    }

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Create new referral
    const { data: referral, error } = await this.supabase
      .from('referrals')
      .insert({
        organization_id: organizationId,
        referrer_id: referrerId,
        referral_code: referralCode,
        reward_amount: rewardAmount,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to generate referral code: ${error.message}`)
    }

    return referral
  }

  // Validate a referral code
  async validateReferralCode(
    organizationId: string,
    referralCode: string
  ): Promise<{ valid: boolean; referral?: Referral; error?: string }> {
    const { data: referral, error } = await this.supabase
      .from('referrals')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('referral_code', referralCode)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { valid: false, error: 'Invalid referral code' }
      }
      return { valid: false, error: 'Failed to validate referral code' }
    }

    if (!referral) {
      return { valid: false, error: 'Invalid referral code' }
    }

    // Check if referral is still valid
    const now = new Date()
    const expiresAt = referral.expires_at ? new Date(referral.expires_at) : null

    if (referral.status !== 'pending') {
      return { valid: false, error: 'Referral code is no longer valid' }
    }

    if (expiresAt && now > expiresAt) {
      // Mark as expired
      await this.supabase
        .from('referrals')
        .update({ status: 'expired' })
        .eq('id', referral.id)

      return { valid: false, error: 'Referral code has expired' }
    }

    return { valid: true, referral }
  }

  // Complete a referral (when referee makes first purchase or signs up)
  async completeReferral(
    referralId: string,
    refereeId: string | null = null,
    refereeEmail: string | null = null
  ): Promise<Referral> {
    // Get the referral
    const { data: referral, error: fetchError } = await this.supabase
      .from('referrals')
      .select('*')
      .eq('id', referralId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch referral: ${fetchError.message}`)
    }

    if (!referral) {
      throw new Error('Referral not found')
    }

    // Update referral with referee info and mark as completed
    const updateData: any = {
      status: 'completed',
      completed_at: new Date().toISOString()
    }

    if (refereeId) {
      updateData.referee_id = refereeId
    }

    if (refereeEmail) {
      updateData.referee_email = refereeEmail
    }

    const { data: updatedReferral, error } = await this.supabase
      .from('referrals')
      .update(updateData)
      .eq('id', referralId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to complete referral: ${error.message}`)
    }

    return updatedReferral
  }

  // Grant rewards to both referrer and referee
  async grantReferralRewards(
    referralId: string
  ): Promise<{
    referrerRewardGranted: boolean;
    refereeRewardGranted: boolean;
  }> {
    // Get the referral
    const { data: referral, error: fetchError } = await this.supabase
      .from('referrals')
      .select('*')
      .eq('id', referralId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch referral: ${fetchError.message}`)
    }

    if (!referral) {
      throw new Error('Referral not found')
    }

    if (referral.status !== 'completed') {
      throw new Error('Referral must be completed before granting rewards')
    }

    // Update reward granted flags
    const updates: any = {}

    if (!referral.referrer_reward_granted) {
      updates.referrer_reward_granted = true
    }

    if (!referral.referee_reward_granted) {
      updates.referee_reward_granted = true
    }

    // In a real implementation, you would actually credit the accounts here
    // For now, we're just marking the rewards as granted

    const { data: updatedReferral, error } = await this.supabase
      .from('referrals')
      .update(updates)
      .eq('id', referralId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to grant referral rewards: ${error.message}`)
    }

    return {
      referrerRewardGranted: updatedReferral.referrer_reward_granted,
      refereeRewardGranted: updatedReferral.referee_reward_granted
    }
  }

  // Get referral stats for an organization
  async getReferralStats(organizationId: string): Promise<{
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    expiredReferrals: number;
    rewardsGranted: number;
  }> {
    const { data, error } = await this.supabase
      .from('referrals')
      .select('status, referrer_reward_granted, referee_reward_granted')
      .eq('organization_id', organizationId)

    if (error) {
      throw new Error(`Failed to fetch referral stats: ${error.message}`)
    }

    const initialStats = {
      totalReferrals: 0,
      completedReferrals: 0,
      pendingReferrals: 0,
      expiredReferrals: 0,
      rewardsGranted: 0
    }

    const result = (data || []).reduce((acc, referral) => {
      acc.totalReferrals++
      if (referral.status === 'completed') acc.completedReferrals++
      else if (referral.status === 'pending') acc.pendingReferrals++
      else if (referral.status === 'expired') acc.expiredReferrals++
      if (referral.referrer_reward_granted || referral.referee_reward_granted) {
        acc.rewardsGranted++
      }
      return acc
    }, initialStats)

    return result
  }

  // Helper method to generate referral codes
  private generateCode(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < length; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return code
  }
}

// Lazy singleton - created on first use
let _referralsService: ReferralsService | null = null

export function getReferralsService(): ReferralsService {
  if (!_referralsService) {
    _referralsService = new ReferralsService(getSupabaseBrowser())
  }
  return _referralsService
}

// Backwards compatibility
export const referralsService = {
  get generateReferralCode() { return getReferralsService().generateReferralCode.bind(getReferralsService()) },
  get validateReferralCode() { return getReferralsService().validateReferralCode.bind(getReferralsService()) },
  get completeReferral() { return getReferralsService().completeReferral.bind(getReferralsService()) },
  get grantReferralRewards() { return getReferralsService().grantReferralRewards.bind(getReferralsService()) },
  get getReferralStats() { return getReferralsService().getReferralStats.bind(getReferralsService()) },
}