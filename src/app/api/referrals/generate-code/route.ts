import { NextResponse } from 'next/server'
import { referralsService } from '@/lib/referrals/service'

export async function POST(request: Request) {
  try {
    const { organizationId, referrerId, rewardAmount, expiresInDays } = await request.json()

    // Validate required fields
    if (!organizationId || !referrerId || typeof rewardAmount !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: organizationId, referrerId, rewardAmount' },
        { status: 400 }
      )
    }

    const referral = await referralsService.generateReferralCode(
      organizationId,
      referrerId,
      rewardAmount,
      expiresInDays
    )

    return NextResponse.json(referral)
  } catch (error) {
    console.error('Error generating referral code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}