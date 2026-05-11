'use client'

import { useState, useEffect } from 'react'
import { Cpu, TrendingUp, TrendingDown, Minus, Zap, User, RefreshCw } from 'lucide-react'
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
  const [livePrice, setLivePrice] = useState(currentPrice)

  // Fetch live price if currentPrice is 0 or not provided
  useEffect(() => {
    if (currentPrice > 0) {
      setLivePrice(currentPrice)
    } else {
      fetchLivePrice()
    }
  }, [symbol, currentPrice])

  useEffect(() => {
    if (symbol) loadSignal()
  }, [symbol, tradeType])

  async function fetchLivePrice() {
    try {
      const res = await fetch(`/api/market-data/quote?symbol=${encodeURIComponent(symbol)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.price > 0) setLivePrice(data.price)
      }
    } catch {}
  }

  async function loadSignal() {
    setLoading(true)
    try {
      const priceToUse = livePrice > 0 ? livePrice : currentPrice
      const res = await fetch('/api/ai-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.replace('.NS', '').replace('.BO', ''),
          currentPrice: priceToUse,
          changePercent: (Math.random() - 0.45) * 5,
          aiMode: user?.aiMode || 'quant',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSignal(data)
      }
    } catch (e) {
      console.error('Signal load error:', e)
    }
    setLoading(false)
  }

  async function executeAITrade() {
    if (!signal) { toast.error('No AI signal yet'); return }
    if (!user) { toast.error('Please log in first'); return }

    const priceToUse = livePrice > 0 ? livePrice : currentPrice
    if (!priceToUse || priceToUse <= 0) {
      toast.error('Could not get current price. Try refreshing.')
      return
    }
    if (!quantity || quantity <= 0) {
      toast.error('Enter a valid quantity')
      return
    }

    setExecuting(true)
    try {
      const payload = {
        userId: user.id,
        symbol: symbol.replace('.NS', '').replace('.BO', ''),
        exchange: 'NSE',
        orderType: signal.action === 'SELL' ? 'SELL' : 'BUY',
        quantity: Number(quantity),
        price: Number(priceToUse),
        tradeType,
        targetPrice: signal.targetPrice,
        stopLoss: signal.stopLoss,
        aiConfidence: signal.confidence,
        aiReasoning: signal.reasoning,
        isPaper: isPaper,
        dhanClientId: user.dhanClientId || null,
        dhanAccessToken: user.dhanAccessToken || null,
      }

      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(`Trade failed: ${data.error || 'Unknown error'}`)
        return
      }

      toast.success(
        `✅ AI ${signal.action}: ${quantity} × ${symbol.replace('.NS', '')} @ ₹${priceToUse.toFixed(2)}`,
        { duration: 5000 }
      )
      onTradeExecuted?.()
      // Reload signal after trade
      setTimeout(loadSignal, 1000)

    } catch (e: any) {
      console.error('Trade execution error:', e)
      toast.error(`Trade failed: ${e.message}`)
    }
    setExecuting(false)
  }

  const actionColors: Record<string, string> = {
    BUY: 'text-accent-green border-accent-green bg-accent-green/10',
    SELL: 'text-accent-red border-accent-red bg-accent-red/10',
    HOLD: 'text-accent-gold border-accent-gold bg-accent-gold/10',
    AVOID: 'text-text-muted border-bg-border bg-bg-hover',
  }

  const displaySymbol = symbol.replace('.NS', '').replace('.BO', '')

  return (
    <div className="border border-bg-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-accent-blue/5 border-b border-bg-border">
        <Cpu size={14} className="text-accent-blue" />
        <span className="text-xs font-mono text-accent-blue uppercase tracking-wider">AI Recommendation</span>
        <button onClick={loadSignal} className="ml-auto text-text-muted hover:text-text-primary transition-colors">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
        <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-ping" />
      </div>

      {/* Live price display */}
      {livePrice > 0 && (
        <div className="px-4 py-2 border-b border-bg-border flex items-center justify-between">
          <span className="text-xs font-mono text-text-muted">{displaySymbol}</span>
          <span className="text-sm font-mono font-bold text-text-primary">
            ₹{livePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {loading ? (
        <div className="p-6 text-center text-text-muted text-xs font-mono animate-pulse">
          AI analyzing {displaySymbol}...
        </div>
      ) : signal ? (
        <div className="p-4 space-y-3">
          {/* Verdict */}
          <div className={`flex items-center justify-between p-3 rounded-lg border ${actionColors[signal.action] || actionColors.HOLD}`}>
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
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                className="w-full bg-bg-secondary border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
              />
            </div>
          </div>

          {/* Cost preview */}
          {livePrice > 0 && (
            <div className="text-xs font-mono text-text-muted text-center">
              Total cost: <span className="text-text-primary font-bold">
                ₹{(livePrice * quantity).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              {isPaper && <span className="text-accent-gold ml-2">(Virtual)</span>}
            </div>
          )}

          {/* Action buttons */}
          {(signal.action === 'BUY' || signal.action === 'SELL') && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={executeAITrade}
                disabled={executing}
                className="flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#00d68f', color: '#0a0e1a' }}
              >
                {executing
                  ? <><RefreshCw size={12} className="animate-spin" /> Executing...</>
                  : <><Zap size={13} /> Let AI Execute</>
                }
              </button>
              <button
                onClick={() => toast('Place the order manually in the order box below.')}
                className="flex items-center justify-center gap-1.5 bg-bg-secondary border border-bg-border text-text-secondary text-xs font-semibold py-2.5 rounded-lg hover:text-text-primary transition-colors"
              >
                <User size={13} />
                I'll Do It Myself
              </button>
            </div>
          )}

          {signal.action === 'HOLD' && (
            <div className="text-center text-xs font-mono text-accent-gold py-2">
              AI recommends holding. No trade needed right now.
            </div>
          )}

          {signal.action === 'AVOID' && (
            <div className="text-center text-xs font-mono text-text-muted py-2">
              AI says avoid this stock currently. Too risky.
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 text-center">
          <button onClick={loadSignal} className="text-accent-blue text-xs font-mono hover:underline">
            Load AI Signal
          </button>
        </div>
      )}
    </div>
  )
}
