import { NextRequest, NextResponse } from 'next/server'
import { analyzeStock } from '@/lib/ai-engine'

export async function POST(req: NextRequest) {
  try {
    const { symbol, currentPrice, prices, volumes, changePercent, aiMode } = await req.json()

    if (!symbol || !currentPrice) {
      return NextResponse.json({ error: 'symbol and currentPrice required' }, { status: 400 })
    }

    // Generate historical mock prices if not provided
    const historicalPrices: number[] = prices || Array.from({ length: 50 }, (_, i) => {
      return currentPrice * (0.9 + Math.random() * 0.2 + i * 0.002)
    })

    const historicalVolumes: number[] = volumes || Array.from({ length: 50 }, () =>
      Math.floor(Math.random() * 5000000 + 500000)
    )

    const signal = analyzeStock(
      symbol,
      currentPrice,
      historicalPrices,
      historicalVolumes,
      changePercent || 0,
      aiMode || 'quant'
    )

    return NextResponse.json(signal)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
