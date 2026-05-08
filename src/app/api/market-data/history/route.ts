import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol') || 'RELIANCE.NS'
  const interval = searchParams.get('interval') || '1d'
  const range = searchParams.get('range') || '3mo'

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    )

    if (!res.ok) throw new Error('Yahoo API failed')

    const data = await res.json()
    const result = data?.chart?.result?.[0]

    if (!result) throw new Error('No result')

    const timestamps = result.timestamp || []
    const ohlcv = result.indicators?.quote?.[0] || {}

    const candles = timestamps.map((ts: number, i: number) => ({
      time: ts,
      open: ohlcv.open?.[i] || 0,
      high: ohlcv.high?.[i] || 0,
      low: ohlcv.low?.[i] || 0,
      close: ohlcv.close?.[i] || 0,
      volume: ohlcv.volume?.[i] || 0,
    })).filter((c: any) => c.open && c.close)

    return NextResponse.json(candles)
  } catch {
    // Generate mock candlestick data
    const now = Math.floor(Date.now() / 1000)
    const intervalSeconds = interval === '1d' ? 86400 : interval === '1h' ? 3600 : 300
    const count = range === '1d' ? 78 : range === '1mo' ? 22 : 90

    let price = 1500 + Math.random() * 1000
    const candles = []

    for (let i = count; i >= 0; i--) {
      const open = price
      const change = (Math.random() - 0.48) * price * 0.025
      const close = open + change
      const high = Math.max(open, close) * (1 + Math.random() * 0.01)
      const low = Math.min(open, close) * (1 - Math.random() * 0.01)

      candles.push({
        time: now - i * intervalSeconds,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: Math.floor(Math.random() * 5000000 + 500000),
      })

      price = close
    }

    return NextResponse.json(candles)
  }
}
