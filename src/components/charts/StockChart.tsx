'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'

interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface AIOverlay {
  entryPrice: number
  targetPrice: number
  stopLoss: number
  signal: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
}

interface Props {
  symbol: string
  showAIOverlay?: boolean
  interval?: string
  range?: string
}

const INTERVALS = [
  { label: '1D', interval: '5m', range: '1d' },
  { label: '1W', interval: '1h', range: '5d' },
  { label: '1M', interval: '1d', range: '1mo' },
  { label: '3M', interval: '1d', range: '3mo' },
  { label: '1Y', interval: '1wk', range: '1y' },
]

export default function StockChart({ symbol, showAIOverlay = false }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<any>(null)
  const [activeInterval, setActiveInterval] = useState(0)
  const [aiOverlay, setAiOverlay] = useState<AIOverlay | null>(null)
  const [currentPrice, setCurrentPrice] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chartRef.current) return

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0e1a' },
        textColor: '#8892a4',
      },
      grid: {
        vertLines: { color: '#1e2d4a' },
        horzLines: { color: '#1e2d4a' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#1e2d4a' },
      timeScale: { borderColor: '#1e2d4a', timeVisible: true },
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight,
    })

    chartInstance.current = chart

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00d68f',
      downColor: '#ff3d71',
      borderUpColor: '#00d68f',
      borderDownColor: '#ff3d71',
      wickUpColor: '#00d68f',
      wickDownColor: '#ff3d71',
    })

    async function loadData() {
      setLoading(true)
      try {
        const { interval, range } = INTERVALS[activeInterval]
        const res = await fetch(
          `/api/market-data/history?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`
        )
        const candles: Candle[] = await res.json()

        if (candles.length > 0) {
          candleSeries.setData(candles.map(c => ({
            time: c.time as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })))

          const last = candles[candles.length - 1]
          setCurrentPrice(last.close)

          // AI overlay lines
          if (showAIOverlay && last.close > 0) {
            const entry = last.close
            const target = entry * 1.04
            const sl = entry * 0.97

            setAiOverlay({ entryPrice: entry, targetPrice: target, stopLoss: sl, signal: 'BUY', confidence: 72 })

            // Entry line
            const entryLine = chart.addLineSeries({ color: '#0095ff', lineWidth: 1, lineStyle: 1 })
            entryLine.setData([
              { time: candles[Math.floor(candles.length * 0.7)].time as any, value: entry },
              { time: last.time as any, value: entry },
            ])

            // Target line
            const targetLine = chart.addLineSeries({ color: '#00d68f', lineWidth: 1, lineStyle: 2 })
            targetLine.setData([
              { time: candles[Math.floor(candles.length * 0.7)].time as any, value: target },
              { time: last.time as any, value: target },
            ])

            // Stop loss line
            const slLine = chart.addLineSeries({ color: '#ff3d71', lineWidth: 1, lineStyle: 2 })
            slLine.setData([
              { time: candles[Math.floor(candles.length * 0.7)].time as any, value: sl },
              { time: last.time as any, value: sl },
            ])
          }

          chart.timeScale().fitContent()
        }
      } catch (e) {
        console.error('Chart load error:', e)
      }
      setLoading(false)
    }

    loadData()

    const ro = new ResizeObserver(() => {
      if (chartRef.current) {
        chart.applyOptions({
          width: chartRef.current.clientWidth,
          height: chartRef.current.clientHeight,
        })
      }
    })
    ro.observe(chartRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [symbol, activeInterval, showAIOverlay])

  return (
    <div className="flex flex-col h-full">
      {/* Chart toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border">
        <div className="flex items-center gap-1">
          {INTERVALS.map((iv, i) => (
            <button
              key={iv.label}
              onClick={() => setActiveInterval(i)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                activeInterval === i
                  ? 'bg-accent-blue/20 text-accent-blue'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>

        {showAIOverlay && aiOverlay && (
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-accent-blue">Entry: ₹{aiOverlay.entryPrice.toFixed(2)}</span>
            <span className="text-accent-green">Target: ₹{aiOverlay.targetPrice.toFixed(2)}</span>
            <span className="text-accent-red">SL: ₹{aiOverlay.stopLoss.toFixed(2)}</span>
          </div>
        )}

        {currentPrice > 0 && (
          <div className="text-sm font-mono font-bold text-text-primary">
            ₹{currentPrice.toFixed(2)}
          </div>
        )}
      </div>

      {/* Chart container */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/50 z-10">
            <div className="text-text-muted text-xs font-mono animate-pulse">Loading chart...</div>
          </div>
        )}
        <div ref={chartRef} className="w-full h-full" />
      </div>
    </div>
  )
}