import { NextResponse } from 'next/server'
import { promotionsService } from '@/lib/promotions/service'

export async function POST(request: Request) {
  try {
    const { promotionId, organizationId, customerId, saleId, discountAmount } = await request.json()

    // Validate required fields
    if (!promotionId || !organizationId || !saleId || typeof discountAmount !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: promotionId, organizationId, saleId, discountAmount' },
        { status: 400 }
      )
    }

    const promotionUse = await promotionsService.applyPromotion(
      promotionId,
      organizationId,
      customerId || null,
      saleId,
      discountAmount
    )

    return NextResponse.json(promotionUse)
  } catch (error) {
    console.error('Error applying promotion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}