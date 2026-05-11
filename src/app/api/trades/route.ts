import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, symbol, exchange = 'NSE', orderType, quantity,
      price, tradeType = 'swing', targetPrice, stopLoss,
      aiConfidence = 70, aiReasoning = '', isPaper = true } = body

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })
    if (!orderType) return NextResponse.json({ error: 'orderType required' }, { status: 400 })
    if (!quantity || Number(quantity) <= 0) return NextResponse.json({ error: 'quantity must be > 0' }, { status: 400 })
    if (!price || Number(price) <= 0) return NextResponse.json({ error: 'price must be > 0' }, { status: 400 })

    const cleanSymbol = symbol.toUpperCase().replace('.NS', '').replace('.BO', '')
    const cleanOrderType = orderType.toUpperCase()
    const numQty = Number(quantity)
    const numPrice = Number(price)

    const { data: trade, error: tradeError } = await supabaseAdmin
      .from('trades')
      .insert({
        user_id: userId, symbol: cleanSymbol, exchange,
        trade_type: tradeType, order_type: cleanOrderType,
        quantity: numQty, price: numPrice,
        target_price: targetPrice ? Number(targetPrice) : null,
        stop_loss: stopLoss ? Number(stopLoss) : null,
        ai_confidence: Number(aiConfidence), ai_reasoning: aiReasoning,
        status: 'OPEN', is_paper: Boolean(isPaper),
        executed_at: new Date().toISOString(),
      })
      .select().single()

    if (tradeError) return NextResponse.json({ error: tradeError.message }, { status: 500 })

    if (cleanOrderType === 'BUY') {
      const { data: existing } = await supabaseAdmin.from('portfolio')
        .select().eq('user_id', userId).eq('symbol', cleanSymbol).maybeSingle()
      if (existing) {
        const newQty = existing.quantity + numQty
        const newAvg = (existing.avg_buy_price * existing.quantity + numPrice * numQty) / newQty
        await supabaseAdmin.from('portfolio').update({
          quantity: newQty, avg_buy_price: parseFloat(newAvg.toFixed(2)),
          current_price: numPrice,
          pnl: parseFloat(((numPrice - newAvg) * newQty).toFixed(2)),
          pnl_percent: parseFloat((((numPrice - newAvg) / newAvg) * 100).toFixed(2)),
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
      } else {
        await supabaseAdmin.from('portfolio').insert({
          user_id: userId, symbol: cleanSymbol, exchange, quantity: numQty,
          avg_buy_price: numPrice, current_price: numPrice, pnl: 0, pnl_percent: 0,
          ai_confidence: Number(aiConfidence) > 75 ? 'high' : Number(aiConfidence) > 55 ? 'medium' : 'low',
          trade_type: tradeType,
        })
      }
    }

    if (cleanOrderType === 'SELL') {
      const { data: existing } = await supabaseAdmin.from('portfolio')
        .select().eq('user_id', userId).eq('symbol', cleanSymbol).maybeSingle()
      if (existing) {
        const newQty = existing.quantity - numQty
        const realizedPnl = (numPrice - existing.avg_buy_price) * numQty
        if (newQty <= 0) {
          await supabaseAdmin.from('portfolio').delete().eq('id', existing.id)
        } else {
          await supabaseAdmin.from('portfolio').update({
            quantity: newQty, current_price: numPrice,
            pnl: parseFloat(((numPrice - existing.avg_buy_price) * newQty).toFixed(2)),
            pnl_percent: parseFloat((((numPrice - existing.avg_buy_price) / existing.avg_buy_price) * 100).toFixed(2)),
          }).eq('id', existing.id)
        }
        await supabaseAdmin.from('trades').update({
          pnl: parseFloat(realizedPnl.toFixed(2)), status: 'CLOSED',
          closed_at: new Date().toISOString(),
        }).eq('id', trade.id)
      }
    }

    await supabaseAdmin.from('ai_activity').insert({
      user_id: userId,
      action: `${cleanOrderType === 'BUY' ? 'Bought' : 'Sold'} ${numQty} × ${cleanSymbol} @ ₹${numPrice}`,
      symbol: cleanSymbol, reasoning: aiReasoning, confidence: Number(aiConfidence),
    })

    return NextResponse.json({ success: true, trade,
      message: `${cleanOrderType} ${numQty} × ${cleanSymbol} @ ₹${numPrice}` })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const isPaper = searchParams.get('isPaper') !== 'false'
  const limit = parseInt(searchParams.get('limit') || '50')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('trades').select('*')
    .eq('user_id', userId).eq('is_paper', isPaper)
    .order('executed_at', { ascending: false }).limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}