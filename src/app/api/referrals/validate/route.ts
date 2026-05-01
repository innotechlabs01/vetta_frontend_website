import { NextResponse } from 'next/server'
import { referralsService } from '@/lib/referrals/service'

export async function POST(request: Request) {
  try {
    const { organizationId, referralCode } = await request.json()

    // Validate required fields
    if (!organizationId || !referralCode) {
      return NextResponse.json(
        { error: 'Missing required fields: organizationId, referralCode' },
        { status: 400 }
      )
    }

    const result = await referralsService.validateReferralCode(
      organizationId,
      referralCode
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error validating referral code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}