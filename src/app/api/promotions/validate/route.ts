import { NextResponse } from 'next/server'
import { promotionsService } from '@/lib/promotions/service'

export async function POST(request: Request) {
  try {
    const { promotionId, organizationId, customerId, cartItems } = await request.json()

    // Validate required fields
    if (!promotionId || !organizationId || !cartItems) {
      return NextResponse.json(
        { error: 'Missing required fields: promotionId, organizationId, cartItems' },
        { status: 400 }
      )
    }

    const result = await promotionsService.validatePromotion(
      promotionId,
      organizationId,
      customerId || null,
      cartItems
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error validating promotion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}