import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 30 },
      }
    )

    if (!res.ok) {
      throw new Error('Yahoo Finance API error')
    }

    const data = await res.json()
    const result = data?.chart?.result?.[0]

    if (!result) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 })
    }

    const meta = result.meta
    const quote = {
      symbol: meta.symbol,
      name: meta.longName || meta.symbol,
      price: meta.regularMarketPrice || 0,
      change: meta.regularMarketPrice - meta.chartPreviousClose || 0,
      changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100 || 0,
      volume: meta.regularMarketVolume || 0,
      high: meta.regularMarketDayHigh || 0,
      low: meta.regularMarketDayLow || 0,
      open: meta.regularMarketOpen || 0,
      prevClose: meta.chartPreviousClose || 0,
      exchange: meta.exchangeName || 'NSE',
    }

    return NextResponse.json(quote)
  } catch (error) {
    // Return mock data if API fails (for development)
    const mockPrice = 1000 + Math.random() * 4000
    return NextResponse.json({
      symbol: symbol.replace('.NS', '').replace('.BO', ''),
      name: symbol,
      price: mockPrice,
      change: (Math.random() - 0.5) * 100,
      changePercent: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 10000000),
      high: mockPrice * 1.02,
      low: mockPrice * 0.98,
      open: mockPrice * 0.99,
      prevClose: mockPrice * 0.995,
      exchange: 'NSE',
    })
  }
}
