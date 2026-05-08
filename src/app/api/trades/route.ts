import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getDhanClient, mapTradeType, mapExchange } from '@/lib/dhan'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      symbol,
      exchange = 'NSE',
      orderType,
      quantity,
      price,
      tradeType = 'swing',
      targetPrice,
      stopLoss,
      aiConfidence = 70,
      aiReasoning = '',
      isPaper = true,
      dhanClientId,
      dhanAccessToken,
    } = body

    if (!userId || !symbol || !orderType || !quantity || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let dhanOrderId: string | null = null

    // Execute real order if not paper trading and Dhan credentials exist
    if (!isPaper && dhanClientId && dhanAccessToken) {
      const dhan = getDhanClient(dhanClientId, dhanAccessToken)

      if (dhan) {
        try {
          const dhanOrder = await dhan.placeOrder({
            dhanClientId,
            transactionType: orderType,
            exchangeSegment: mapExchange(exchange) as any,
            productType: mapTradeType(tradeType) as any,
            orderType: 'LIMIT',
            validity: tradeType === 'intraday' ? 'DAY' : 'DAY',
            tradingSymbol: symbol,
            securityId: '', // Would need to look this up from Dhan's security master
            quantity,
            price,
          })

          dhanOrderId = dhanOrder?.orderId || null
        } catch (dhanError) {
          console.error('Dhan order failed:', dhanError)
          // Continue to save in our DB even if Dhan fails
        }
      }
    }

    // Save trade to Supabase
    const { data: trade, error } = await supabase
      .from('trades')
      .insert({
        user_id: userId,
        symbol,
        exchange,
        trade_type: tradeType,
        order_type: orderType,
        quantity,
        price,
        target_price: targetPrice,
        stop_loss: stopLoss,
        ai_confidence: aiConfidence,
        ai_reasoning: aiReasoning,
        status: 'OPEN',
        is_paper: isPaper,
        dhan_order_id: dhanOrderId,
        executed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update portfolio holdings
    if (orderType === 'BUY') {
      const { data: existing } = await supabase
        .from('portfolio')
        .select()
        .eq('user_id', userId)
        .eq('symbol', symbol)
        .single()

      if (existing) {
        const newQty = existing.quantity + quantity
        const newAvgPrice = (existing.avg_buy_price * existing.quantity + price * quantity) / newQty

        await supabase
          .from('portfolio')
          .update({
            quantity: newQty,
            avg_buy_price: newAvgPrice,
            current_price: price,
            pnl: (price - newAvgPrice) * newQty,
            pnl_percent: ((price - newAvgPrice) / newAvgPrice) * 100,
          })
          .eq('id', existing.id)
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
          ai_confidence: aiConfidence > 75 ? 'high' : aiConfidence > 55 ? 'medium' : 'low',
          trade_type: tradeType,
        })
      }
    }

    // Log AI activity
    await supabase.from('ai_activity').insert({
      user_id: userId,
      action: `${orderType === 'BUY' ? 'Bought' : 'Sold'} ${quantity} shares of ${symbol}`,
      symbol,
      reasoning: aiReasoning,
      confidence: aiConfidence,
    })

    return NextResponse.json({ success: true, trade, dhanOrderId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const isPaper = searchParams.get('isPaper') === 'true'
  const limit = parseInt(searchParams.get('limit') || '50')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('trades')
    .select()
    .eq('user_id', userId)
    .eq('is_paper', isPaper)
    .order('executed_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
