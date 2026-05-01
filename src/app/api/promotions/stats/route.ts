import { NextResponse } from 'next/server'
import { promotionsService } from '@/lib/promotions/service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing required parameter: organizationId' },
        { status: 400 }
      )
    }

    const stats = await promotionsService.getPromotionStats(organizationId)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching promotion stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}