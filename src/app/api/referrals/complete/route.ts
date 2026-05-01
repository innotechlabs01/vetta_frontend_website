import { NextResponse } from 'next/server'
import { referralsService } from '@/lib/referrals/service'

export async function POST(request: Request) {
  try {
    const { referralId, refereeId, refereeEmail } = await request.json()

    // Validate required fields
    if (!referralId) {
      return NextResponse.json(
        { error: 'Missing required field: referralId' },
        { status: 400 }
      )
    }

    const referral = await referralsService.completeReferral(
      referralId,
      refereeId || null,
      refereeEmail || null
    )

    return NextResponse.json(referral)
  } catch (error) {
    console.error('Error completing referral:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}