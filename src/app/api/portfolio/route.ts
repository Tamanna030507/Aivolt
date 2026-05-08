import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    const { data: portfolio, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Calculate totals
    const totalInvested = portfolio?.reduce(
      (sum, h) => sum + h.avg_buy_price * h.quantity, 0
    ) || 0

    const totalCurrent = portfolio?.reduce(
      (sum, h) => sum + h.current_price * h.quantity, 0
    ) || 0

    const totalPnL = totalCurrent - totalInvested
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

    return NextResponse.json({
      holdings: portfolio || [],
      summary: {
        totalInvested,
        totalCurrent,
        totalPnL,
        totalPnLPercent,
        holdingsCount: portfolio?.length || 0,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Update portfolio prices (called periodically)
export async function PUT(req: NextRequest) {
  try {
    const { userId, updates } = await req.json()

    for (const update of updates) {
      const { symbol, currentPrice } = update

      const { data: holding } = await supabase
        .from('portfolio')
        .select()
        .eq('user_id', userId)
        .eq('symbol', symbol)
        .single()

      if (holding) {
        const pnl = (currentPrice - holding.avg_buy_price) * holding.quantity
        const pnlPercent = ((currentPrice - holding.avg_buy_price) / holding.avg_buy_price) * 100

        await supabase
          .from('portfolio')
          .update({ current_price: currentPrice, pnl, pnl_percent: pnlPercent })
          .eq('id', holding.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
