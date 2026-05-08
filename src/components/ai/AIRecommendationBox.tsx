'use client'

import { useState, useEffect } from 'react'
import { Cpu, TrendingUp, TrendingDown, Minus, Zap, User } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'

interface Props {
  symbol: string
  currentPrice: number
  isPaper?: boolean
  onTradeExecuted?: () => void
}

interface AISignal {
  action: 'BUY' | 'SELL' | 'HOLD' | 'AVOID'
  confidence: number
  entryPrice: number
  targetPrice: number
  stopLoss: number
  reasoning: string
  tradeType: string
  timeframe: string
  riskReward: number
}

export default function AIRecommendationBox({ symbol, currentPrice, isPaper = true, onTradeExecuted }: Props) {
  const { user } = useAppStore()
  const [signal, setSignal] = useState<AISignal | null>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [quantity, setQuantity] = useState(10)
  const [tradeType, setTradeType] = useState<'intraday' | 'swing' | 'options' | 'delivery'>('swing')

  useEffect(() => {
    if (!symbol || !currentPrice) return
    loadSignal()
  }, [symbol, currentPrice, tradeType])

  async function loadSignal() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.replace('.NS', '').replace('.BO', ''),
          currentPrice,
          changePercent: (Math.random() - 0.45) * 5,
          aiMode: user?.aiMode || 'quant',
        }),
      })
      if (res.ok) setSignal(await res.json())
    } catch {}
    setLoading(false)
  }

  async function executeAITrade() {
    if (!signal || !user) return
    setExecuting(true)
    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          symbol: symbol.replace('.NS', '').replace('.BO', ''),
          exchange: 'NSE',
          orderType: signal.action === 'SELL' ? 'SELL' : 'BUY',
          quantity,
          price: currentPrice,
          tradeType,
          targetPrice: signal.targetPrice,
          stopLoss: signal.stopLoss,
          aiConfidence: signal.confidence,
          aiReasoning: signal.reasoning,
          isPaper,
          dhanClientId: user.dhanClientId,
          dhanAccessToken: user.dhanAccessToken,
        }),
      })
      if (res.ok) {
        toast.success(`AI executed: ${signal.action} ${quantity} × ${symbol.replace('.NS', '')} @ ₹${currentPrice}`)
        onTradeExecuted?.()
      }
    } catch (e) {
      toast.error('Trade execution failed')
    }
    setExecuting(false)
  }

  const actionColors = {
    BUY: 'text-accent-green border-accent-green bg-accent-green/10',
    SELL: 'text-accent-red border-accent-red bg-accent-red/10',
    HOLD: 'text-accent-gold border-accent-gold bg-accent-gold/10',
    AVOID: 'text-text-muted border-bg-border bg-bg-hover',
  }

  return (
    <div className="border border-bg-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-accent-blue/5 border-b border-bg-border">
        <Cpu size={14} className="text-accent-blue" />
        <span className="text-xs font-mono text-accent-blue uppercase tracking-wider">AI Recommendation</span>
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-green animate-ping" />
      </div>

      {loading ? (
        <div className="p-6 text-center text-text-muted text-xs font-mono animate-pulse">
          AI analyzing {symbol.replace('.NS', '')}...
        </div>
      ) : signal ? (
        <div className="p-4 space-y-4">
          {/* Verdict */}
          <div className={`flex items-center justify-between p-3 rounded-lg border ${actionColors[signal.action]}`}>
            <div className="flex items-center gap-2">
              {signal.action === 'BUY' ? <TrendingUp size={18} /> :
               signal.action === 'SELL' ? <TrendingDown size={18} /> : <Minus size={18} />}
              <span className="font-bold text-lg font-mono">{signal.action}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono font-bold">{signal.confidence}%</div>
              <div className="text-xs opacity-70">confidence</div>
            </div>
          </div>

          {/* Price targets */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-bg-secondary rounded-lg p-2">
              <div className="text-[10px] text-text-muted font-mono mb-1">ENTRY</div>
              <div className="text-xs font-mono font-bold text-accent-blue">₹{signal.entryPrice.toFixed(2)}</div>
            </div>
            <div className="bg-bg-secondary rounded-lg p-2">
              <div className="text-[10px] text-text-muted font-mono mb-1">TARGET</div>
              <div className="text-xs font-mono font-bold text-accent-green">₹{signal.targetPrice.toFixed(2)}</div>
            </div>
            <div className="bg-bg-secondary rounded-lg p-2">
              <div className="text-[10px] text-text-muted font-mono mb-1">STOP LOSS</div>
              <div className="text-xs font-mono font-bold text-accent-red">₹{signal.stopLoss.toFixed(2)}</div>
            </div>
          </div>

          {/* Details */}
          <div className="flex justify-between text-xs font-mono text-text-muted">
            <span>Timeframe: <span className="text-text-secondary">{signal.timeframe}</span></span>
            <span>R:R = <span className="text-text-secondary">1:{signal.riskReward}</span></span>
          </div>

          {/* Reasoning */}
          <div className="bg-bg-secondary rounded-lg p-3">
            <div className="text-[10px] font-mono text-text-muted mb-1">AI REASONING</div>
            <p className="text-xs text-text-secondary leading-relaxed">{signal.reasoning}</p>
          </div>

          {/* Trade config */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] font-mono text-text-muted mb-1">TYPE</div>
              <select
                value={tradeType}
                onChange={e => setTradeType(e.target.value as any)}
                className="w-full bg-bg-secondary border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary outline-none"
              >
                <option value="intraday">Intraday</option>
                <option value="swing">Swing</option>
                <option value="delivery">Delivery</option>
                <option value="options">Options</option>
              </select>
            </div>
            <div>
              <div className="text-[10px] font-mono text-text-muted mb-1">QTY</div>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                min={1}
                className="w-full bg-bg-secondary border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary outline-none"
              />
            </div>
          </div>

          {/* Action buttons */}
          {(signal.action === 'BUY' || signal.action === 'SELL') && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={executeAITrade}
                disabled={executing}
                className="flex items-center justify-center gap-1.5 bg-accent-green text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50"
              >
                <Zap size={13} />
                {executing ? 'Executing...' : 'Let AI Execute'}
              </button>
              <button className="flex items-center justify-center gap-1.5 bg-bg-secondary border border-bg-border text-text-secondary text-xs font-semibold py-2.5 rounded-lg hover:text-text-primary transition-colors">
                <User size={13} />
                I'll Do It Myself
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}