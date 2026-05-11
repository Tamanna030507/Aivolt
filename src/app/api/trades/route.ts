import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // Validate all required fields
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    if (!symbol) return NextResponse.json({ error: 'symbol is required' }, { status: 400 })
    if (!orderType) return NextResponse.json({ error: 'orderType is required' }, { status: 400 })
    if (!quantity || Number(quantity) <= 0) return NextResponse.json({ error: 'quantity must be > 0' }, { status: 400 })
    if (!price || Number(price) <= 0) return NextResponse.json({ error: 'price must be > 0' }, { status: 400 })

    // Save trade to Supabase
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert({
        user_id: userId,
        symbol: symbol.toUpperCase(),
        exchange,
        trade_type: tradeType,
        order_type: orderType.toUpperCase(),
        quantity: Number(quantity),
        price: Number(price),
        target_price: targetPrice ? Number(targetPrice) : null,
        stop_loss: stopLoss ? Number(stopLoss) : null,
        ai_confidence: Number(aiConfidence),
        ai_reasoning: aiReasoning,
        status: 'OPEN',
        is_paper: Boolean(isPaper),
        executed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (tradeError) {
      console.error('Trade insert error:', tradeError)
      return NextResponse.json({ error: tradeError.message }, { status: 500 })
    }

    // Update portfolio holdings (upsert)
    if (orderType.toUpperCase() === 'BUY') {
      const { data: existing } = await supabase
        .from('portfolio')
        .select()
        .eq('user_id', userId)
        .eq('symbol', symbol.toUpperCase())
        .maybeSingle()

      if (existing) {
        const newQty = existing.quantity + Number(quantity)
        const newAvgPrice = (existing.avg_buy_price * existing.quantity + Number(price) * Number(quantity)) / newQty
        const newPnl = (Number(price) - newAvgPrice) * newQty

        await supabase
          .from('portfolio')
          .update({
            quantity: newQty,
            avg_buy_price: newAvgPrice,
            current_price: Number(price),
            pnl: newPnl,
            pnl_percent: ((Number(price) - newAvgPrice) / newAvgPrice) * 100,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('portfolio').insert({
          user_id: userId,
          symbol: symbol.toUpperCase(),
          exchange,
          quantity: Number(quantity),
          avg_buy_price: Number(price),
          current_price: Number(price),
          pnl: 0,
          pnl_percent: 0,
          ai_confidence: Number(aiConfidence) > 75 ? 'high' : Number(aiConfidence) > 55 ? 'medium' : 'low',
          trade_type: tradeType,
        })
      }
    }

    // For SELL — reduce or remove from portfolio
    if (orderType.toUpperCase() === 'SELL') {
      const { data: existing } = await supabase
        .from('portfolio')
        .select()
        .eq('user_id', userId)
        .eq('symbol', symbol.toUpperCase())
        .maybeSingle()

      if (existing) {
        const newQty = existing.quantity - Number(quantity)
        const realizedPnl = (Number(price) - existing.avg_buy_price) * Number(quantity)

        if (newQty <= 0) {
          await supabase.from('portfolio').delete().eq('id', existing.id)
        } else {
          await supabase.from('portfolio').update({
            quantity: newQty,
            current_price: Number(price),
            pnl: (Number(price) - existing.avg_buy_price) * newQty,
            pnl_percent: ((Number(price) - existing.avg_buy_price) / existing.avg_buy_price) * 100,
          }).eq('id', existing.id)
        }

        // Update trade with realized PnL
        await supabase.from('trades').update({
          pnl: realizedPnl,
          status: 'CLOSED',
          closed_at: new Date().toISOString(),
        }).eq('id', trade.id)
      }
    }

    // Log AI activity
    await supabase.from('ai_activity').insert({
      user_id: userId,
      action: `${orderType.toUpperCase() === 'BUY' ? 'Bought' : 'Sold'} ${quantity} × ${symbol}`,
      symbol: symbol.toUpperCase(),
      reasoning: aiReasoning,
      confidence: Number(aiConfidence),
    })

    return NextResponse.json({
      success: true,
      trade,
      message: `${orderType} order placed for ${quantity} shares of ${symbol} at ₹${price}`,
    })

  } catch (error: any) {
    console.error('Trades API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
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
    .select('*')
    .eq('user_id', userId)
    .eq('is_paper', isPaper)
    .order('executed_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
