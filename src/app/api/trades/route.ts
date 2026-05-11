import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role on server to bypass RLS for trade inserts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId, symbol, exchange = 'NSE', orderType, quantity, price,
      tradeType = 'swing', targetPrice, stopLoss,
      aiConfidence = 70, aiReasoning = '', isPaper = true,
      dhanClientId, dhanAccessToken,
    } = body

    // Validation
    if (!userId)    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    if (!symbol)    return NextResponse.json({ error: 'symbol is required' }, { status: 400 })
    if (!orderType) return NextResponse.json({ error: 'orderType is required' }, { status: 400 })
    if (!quantity || quantity < 1) return NextResponse.json({ error: 'quantity must be >= 1' }, { status: 400 })
    if (!price || price <= 0)      return NextResponse.json({ error: 'price must be > 0' }, { status: 400 })

    let dhanOrderId: string | null = null

    // Real Dhan order (only if NOT paper and credentials exist)
    if (!isPaper && dhanClientId && dhanAccessToken) {
      try {
        const productType = tradeType === 'intraday' ? 'INTRADAY' : 'CNC'
        const segment = exchange === 'BSE' ? 'BSE_EQ' : 'NSE_EQ'

        const dhanRes = await fetch('https://api.dhan.co/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access-token': dhanAccessToken,
            'client-id': dhanClientId,
          },
          body: JSON.stringify({
            dhanClientId,
            transactionType: orderType,
            exchangeSegment: segment,
            productType,
            orderType: 'MARKET',
            validity: 'DAY',
            tradingSymbol: symbol,
            securityId: '',
            quantity,
            price,
          }),
        })

        if (dhanRes.ok) {
          const dhanData = await dhanRes.json()
          dhanOrderId = dhanData?.orderId || null
        }
      } catch (dhanErr) {
        console.warn('Dhan order failed (continuing with DB save):', dhanErr)
      }
    }

    // Save trade to Supabase
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert({
        user_id: userId,
        symbol,
        exchange,
        trade_type: tradeType,
        order_type: orderType,
        quantity,
        price,
        target_price: targetPrice || null,
        stop_loss: stopLoss || null,
        ai_confidence: aiConfidence,
        ai_reasoning: aiReasoning,
        status: 'OPEN',
        is_paper: isPaper,
        dhan_order_id: dhanOrderId,
        executed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (tradeError) {
      console.error('Trade insert error:', tradeError)
      return NextResponse.json({ error: tradeError.message }, { status: 500 })
    }

    // Update portfolio
    if (orderType === 'BUY') {
      const { data: existing } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', userId)
        .eq('symbol', symbol)
        .maybeSingle()

      if (existing) {
        const newQty = existing.quantity + quantity
        const newAvg = (existing.avg_buy_price * existing.quantity + price * quantity) / newQty
        const newPnl = (price - newAvg) * newQty
        await supabase.from('portfolio').update({
          quantity: newQty,
          avg_buy_price: +newAvg.toFixed(2),
          current_price: price,
          pnl: +newPnl.toFixed(2),
          pnl_percent: +((price - newAvg) / newAvg * 100).toFixed(2),
          ai_confidence: aiConfidence >= 75 ? 'high' : aiConfidence >= 55 ? 'medium' : 'low',
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
      } else {
        await supabase.from('portfolio').insert({
          user_id: userId,
          symbol,
          exchange,
          quantity,
          avg_buy_price: price,
          current_price: price,
          pnl: 0,
          pnl_percent: 0,
          ai_confidence: aiConfidence >= 75 ? 'high' : aiConfidence >= 55 ? 'medium' : 'low',
          trade_type: tradeType,
        })
      }
    } else if (orderType === 'SELL') {
      // Reduce or remove position
      const { data: existing } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', userId)
        .eq('symbol', symbol)
        .maybeSingle()

      if (existing) {
        const newQty = existing.quantity - quantity
        if (newQty <= 0) {
          await supabase.from('portfolio').delete().eq('id', existing.id)
        } else {
          const pnl = (price - existing.avg_buy_price) * newQty
          await supabase.from('portfolio').update({
            quantity: newQty,
            current_price: price,
            pnl: +pnl.toFixed(2),
            pnl_percent: +((price - existing.avg_buy_price) / existing.avg_buy_price * 100).toFixed(2),
          }).eq('id', existing.id)
        }
      }
    }

    // Log AI activity
    const actionText = orderType === 'BUY'
      ? `Bought ${quantity} shares of ${symbol} @ ₹${price.toFixed(2)}`
      : `Sold ${quantity} shares of ${symbol} @ ₹${price.toFixed(2)}`

    await supabase.from('ai_activity').insert({
      user_id: userId,
      action: actionText,
      symbol,
      reasoning: aiReasoning || 'AI executed trade based on technical analysis',
      confidence: aiConfidence,
    })

    // Update daily PnL record
    const today = new Date().toISOString().split('T')[0]
    const { data: pnlRecord } = await supabase
      .from('pnl_history')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('is_paper', isPaper)
      .maybeSingle()

    if (pnlRecord) {
      await supabase.from('pnl_history').update({
        total_trades: (pnlRecord.total_trades || 0) + 1,
      }).eq('id', pnlRecord.id)
    } else {
      await supabase.from('pnl_history').insert({
        user_id: userId,
        date: today,
        realized_pnl: 0,
        unrealized_pnl: 0,
        total_trades: 1,
        winning_trades: 0,
        is_paper: isPaper,
      })
    }

    return NextResponse.json({
      success: true,
      trade,
      dhanOrderId,
      message: `${orderType} ${quantity}× ${symbol} @ ₹${price}${isPaper ? ' [PAPER]' : ' [LIVE]'}`,
    })
  } catch (error: any) {
    console.error('Trade API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const isPaper = searchParams.get('isPaper') !== 'false'
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .eq('is_paper', isPaper)
    .order('executed_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}