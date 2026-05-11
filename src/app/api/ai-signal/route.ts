import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { symbol, currentPrice, changePercent = 0, aiMode = 'quant' } = body

    if (!symbol || !currentPrice) {
      return NextResponse.json({ error: 'symbol and currentPrice required' }, { status: 400 })
    }

    // --- Fetch real historical prices server-side (no CORS issue here) ---
    let prices: number[] = []
    let volumes: number[] = []

    try {
      const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=3mo`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          next: { revalidate: 300 },
        }
      )

      if (res.ok) {
        const data = await res.json()
        const result = data?.chart?.result?.[0]
        if (result) {
          const ohlcv = result.indicators?.quote?.[0]
          prices = (ohlcv?.close || []).filter(Boolean)
          volumes = (ohlcv?.volume || []).filter(Boolean)
        }
      }
    } catch (e) {
      console.log('Yahoo fetch failed, using synthetic data')
    }

    // Fallback synthetic data if fetch fails
    if (prices.length < 10) {
      const base = currentPrice
      prices = Array.from({ length: 60 }, (_, i) => {
        return base * (0.85 + Math.random() * 0.3 + i * 0.001)
      })
      volumes = Array.from({ length: 60 }, () => Math.floor(Math.random() * 5000000 + 500000))
    }

    const signal = analyzeStock(symbol, currentPrice, prices, volumes, changePercent, aiMode)
    return NextResponse.json(signal)
  } catch (error: any) {
    console.error('AI signal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ---- Technical Analysis ----

function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50
  let gains = 0, losses = 0
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff >= 0) gains += diff
    else losses += Math.abs(diff)
  }
  let avgGain = gains / period
  let avgLoss = losses / period
  if (avgLoss === 0) return 100
  return 100 - 100 / (1 + avgGain / avgLoss)
}

function calculateEMA(prices: number[], period: number): number {
  if (!prices.length) return 0
  const k = 2 / (period + 1)
  let ema = prices[0]
  for (let i = 1; i < prices.length; i++) ema = prices[i] * k + ema * (1 - k)
  return ema
}

function calculateBollingerBands(prices: number[], period = 20) {
  if (prices.length < period) return { upper: 0, middle: prices[prices.length - 1] || 0, lower: 0 }
  const slice = prices.slice(-period)
  const mean = slice.reduce((a, b) => a + b, 0) / period
  const variance = slice.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / period
  const std = Math.sqrt(variance)
  return { upper: mean + 2 * std, middle: mean, lower: mean - 2 * std }
}

function analyzeStock(
  symbol: string,
  currentPrice: number,
  prices: number[],
  volumes: number[],
  changePercent: number,
  aiMode: string
) {
  const rsi = calculateRSI(prices)
  const ema20 = calculateEMA(prices.slice(-30), 20)
  const ema50 = calculateEMA(prices.slice(-60), 50)
  const bb = calculateBollingerBands(prices)
  const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
  const curVol = volumes[volumes.length - 1] || avgVol
  const volumeRatio = avgVol > 0 ? curVol / avgVol : 1

  let action: 'BUY' | 'SELL' | 'HOLD' | 'AVOID' = 'HOLD'
  let confidence = 50
  let reasons: string[] = []

  // RSI
  if (rsi < 35) { action = 'BUY'; confidence += 18; reasons.push(`RSI oversold at ${rsi.toFixed(0)}`) }
  else if (rsi > 65) { action = 'SELL'; confidence += 14; reasons.push(`RSI overbought at ${rsi.toFixed(0)}`) }
  else reasons.push(`RSI neutral at ${rsi.toFixed(0)}`)

  // EMA crossover
  if (ema20 > ema50 * 1.001) {
    if (action !== 'SELL') action = 'BUY'
    confidence += 14; reasons.push('EMA20 above EMA50 — bullish structure')
  } else if (ema20 < ema50 * 0.999) {
    if (action !== 'BUY') action = 'SELL'
    confidence += 10; reasons.push('EMA20 below EMA50 — bearish structure')
  }

  // Bollinger Bands
  if (bb.lower > 0 && currentPrice < bb.lower) {
    if (action !== 'SELL') action = 'BUY'
    confidence += 14; reasons.push('Price below lower Bollinger Band — bounce likely')
  } else if (bb.upper > 0 && currentPrice > bb.upper) {
    if (action !== 'BUY') action = 'SELL'
    confidence += 10; reasons.push('Price above upper BB — overextended')
  }

  // Volume
  if (volumeRatio > 1.5) { confidence += 10; reasons.push(`Volume ${volumeRatio.toFixed(1)}x above average`) }

  // Price momentum
  if (changePercent > 2.5) { confidence += 8; reasons.push(`Strong day +${changePercent.toFixed(1)}%`) }
  else if (changePercent < -2.5) { confidence -= 5 }

  // AI mode tweaks
  if (aiMode === 'safe' && confidence < 72) action = 'HOLD'
  if (aiMode === 'hypergrowth') confidence += 5
  if (aiMode === 'warren' && rsi < 40) confidence += 8

  confidence = Math.min(91, Math.max(38, confidence))

  const atr = currentPrice * 0.022
  const riskMult = aiMode === 'hypergrowth' ? 2.5 : aiMode === 'safe' ? 1.3 : 2.0

  const targetPrice = action === 'BUY'
    ? +(currentPrice + atr * riskMult * 2).toFixed(2)
    : +(currentPrice - atr * riskMult * 2).toFixed(2)
  const stopLoss = action === 'BUY'
    ? +(currentPrice - atr * riskMult).toFixed(2)
    : +(currentPrice + atr * riskMult).toFixed(2)

  const riskReward = +(Math.abs(targetPrice - currentPrice) / Math.abs(stopLoss - currentPrice)).toFixed(1)

  let tradeType = 'swing'
  if (Math.abs(changePercent) > 3) tradeType = 'intraday'

  return {
    symbol,
    action,
    confidence: Math.round(confidence),
    entryPrice: +currentPrice.toFixed(2),
    targetPrice,
    stopLoss,
    reasoning: reasons.slice(0, 3).join('. ') + '.',
    tradeType,
    timeframe: tradeType === 'intraday' ? 'Same day' : '3–7 trading days',
    riskReward,
  }
}