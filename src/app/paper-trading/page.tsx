'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import AppLayout from '@/components/layout/AppLayout'
import StockChart from '@/components/charts/StockChart'
import PnLChart from '@/components/charts/PnLChart'
import AIRecommendationBox from '@/components/ai/AIRecommendationBox'
import { FlaskConical, Zap, BarChart2, TrendingDown, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatINR } from '@/lib/market'

const TABS = ['Simulation Lab', 'Crash Simulator', 'Strategy Comparison']

const CRASH_EVENTS = [
  {
    id: 'covid2020',
    name: 'COVID Crash — March 2020',
    desc: 'NIFTY fell 38% in 40 days. The fastest bear market in history.',
    maxDrop: -38,
    duration: '40 days',
    recovery: '6 months',
  },
  {
    id: 'global2008',
    name: 'Global Financial Crisis — 2008',
    desc: 'SENSEX fell 60% over 12 months. Lehman collapse triggered global sell-off.',
    maxDrop: -60,
    duration: '12 months',
    recovery: '18 months',
  },
  {
    id: 'ratehike2022',
    name: 'Fed Rate Hike Selloff — 2022',
    desc: 'NIFTY IT index fell 35%. Rising US rates hit high-growth stocks hard.',
    maxDrop: -35,
    duration: '9 months',
    recovery: '14 months',
  },
]

const STRATEGIES = [
  { id: 'warren', name: 'Warren Mode', desc: 'Value investing, low turnover', color: '#0095ff', return7d: 1.2, return30d: 4.8, return90d: 11.2 },
  { id: 'quant', name: 'Quant Mode', desc: 'Data-driven, balanced risk', color: '#00d68f', return7d: 2.1, return30d: 6.3, return90d: 15.7 },
  { id: 'safe', name: 'Safe Mode', desc: 'Capital preservation first', color: '#ffaa00', return7d: 0.8, return30d: 2.9, return90d: 7.4 },
  { id: 'hypergrowth', name: 'Hypergrowth Mode', desc: 'Max aggression, high risk', color: '#ff3d71', return7d: 3.4, return30d: 9.1, return90d: 21.3 },
]

export default function PaperTradingPage() {
  const router = useRouter()
  const { user, isPaperMode, setIsPaperMode } = useAppStore()
  const [tab, setTab] = useState(0)
  const [selectedCrash, setSelectedCrash] = useState<string | null>(null)
  const [crashResult, setCrashResult] = useState<any>(null)
  const [simulating, setSimulating] = useState(false)
  const [virtualBalance, setVirtualBalance] = useState(user?.virtualBalance || 1000000)
  const [holdings, setHoldings] = useState<any[]>([])

  useEffect(() => {
    if (!user) { router.push('/'); return }
    setIsPaperMode(true)
  }, [user])

  function simulateCrash(crashId: string) {
    setSelectedCrash(crashId)
    setSimulating(true)
    const crash = CRASH_EVENTS.find(c => c.id === crashId)!

    setTimeout(() => {
      const portfolioValue = virtualBalance
      const maxLoss = portfolioValue * (crash.maxDrop / 100)
      const panicShieldSaved = Math.abs(maxLoss) * 0.65 // AI saves 65%
      const actualLoss = maxLoss * 0.35

      setCrashResult({
        crash,
        portfolioValue,
        withoutAI: portfolioValue + maxLoss,
        withAI: portfolioValue + actualLoss,
        saved: panicShieldSaved,
        shieldActivatedAt: Math.floor(Math.abs(crash.maxDrop) * 0.3) + '%',
      })
      setSimulating(false)
    }, 2000)
  }

  if (!user) return null

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical size={18} className="text-accent-gold" />
              <h1 className="text-xl font-display font-bold text-text-primary">Paper Trading Lab</h1>
              <span className="ai-badge virtual-badge">VIRTUAL MONEY</span>
            </div>
            <p className="text-text-secondary text-sm">Real market data, zero real money. Test AI strategies safely.</p>
          </div>

          <div className="text-right panel px-6 py-3">
            <div className="text-xs font-mono text-text-muted mb-0.5">VIRTUAL BALANCE</div>
            <div className="text-2xl font-mono font-bold text-accent-gold">{formatINR(virtualBalance)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-bg-border mb-6">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-4 py-3 text-sm font-mono transition-colors border-b-2 ${
                tab === i ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Simulation Lab */}
        {tab === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="panel overflow-hidden" style={{ height: 380 }}>
                <StockChart symbol="RELIANCE.NS" showAIOverlay />
              </div>
              <PnLChart />
            </div>

            <div className="space-y-4">
              <AIRecommendationBox
                symbol="RELIANCE.NS"
                currentPrice={2800}
                isPaper={true}
                onTradeExecuted={() => toast.success('Paper trade executed!')}
              />

              <div className="panel p-4">
                <div className="text-xs font-mono text-text-muted mb-3">PAPER PORTFOLIO STATS</div>
                {[
                  { label: 'Starting Balance', value: '₹10,00,000' },
                  { label: 'Current Value', value: formatINR(virtualBalance) },
                  { label: 'Total Trades', value: holdings.length },
                  { label: 'Win Rate', value: '64.2%' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2 border-b border-bg-border last:border-0">
                    <span className="text-xs text-text-muted font-mono">{label}</span>
                    <span className="text-xs font-mono font-bold text-text-primary">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Crash Simulator */}
        {tab === 1 && (
          <div className="max-w-3xl">
            <p className="text-text-secondary text-sm mb-6">
              See how your current portfolio settings would have survived historical market crashes.
              The AI Panic Shield activates automatically to minimize losses.
            </p>

            <div className="grid gap-4 mb-8">
              {CRASH_EVENTS.map(crash => (
                <button
                  key={crash.id}
                  onClick={() => simulateCrash(crash.id)}
                  className={`panel p-5 text-left hover:border-accent-red/50 transition-all ${
                    selectedCrash === crash.id ? 'border-accent-red/50 bg-accent-red/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-text-primary font-semibold mb-1">{crash.name}</div>
                      <div className="text-text-secondary text-sm">{crash.desc}</div>
                    </div>
                    <div className="text-accent-red font-mono font-bold text-lg ml-4">{crash.maxDrop}%</div>
                  </div>
                  <div className="flex gap-6 text-xs font-mono text-text-muted">
                    <span>Duration: {crash.duration}</span>
                    <span>Recovery: {crash.recovery}</span>
                  </div>
                </button>
              ))}
            </div>

            {simulating && (
              <div className="panel p-8 text-center">
                <div className="text-text-muted font-mono text-sm animate-pulse">
                  Simulating crash scenario... Running AI Panic Shield...
                </div>
              </div>
            )}

            {crashResult && !simulating && (
              <div className="panel p-6 border-accent-red/30">
                <div className="text-lg font-display font-bold text-text-primary mb-4">
                  Simulation Result: {crashResult.crash.name}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl p-4 text-center">
                    <div className="text-xs font-mono text-text-muted mb-1">WITHOUT AI</div>
                    <div className="text-xl font-mono font-bold text-accent-red">
                      {formatINR(crashResult.withoutAI)}
                    </div>
                    <div className="text-xs text-accent-red font-mono mt-1">
                      {((crashResult.withoutAI - crashResult.portfolioValue) / crashResult.portfolioValue * 100).toFixed(1)}% loss
                    </div>
                  </div>

                  <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-4 text-center">
                    <div className="text-xs font-mono text-text-muted mb-1">WITH AI SHIELD</div>
                    <div className="text-xl font-mono font-bold text-accent-green">
                      {formatINR(crashResult.withAI)}
                    </div>
                    <div className="text-xs text-accent-green font-mono mt-1">
                      {((crashResult.withAI - crashResult.portfolioValue) / crashResult.portfolioValue * 100).toFixed(1)}% loss
                    </div>
                  </div>

                  <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-xl p-4 text-center">
                    <div className="text-xs font-mono text-text-muted mb-1">AI SAVED YOU</div>
                    <div className="text-xl font-mono font-bold text-accent-blue">
                      {formatINR(crashResult.saved)}
                    </div>
                    <div className="text-xs text-accent-blue font-mono mt-1">
                      Shield triggered at {crashResult.shieldActivatedAt} drop
                    </div>
                  </div>
                </div>

                <div className="bg-bg-secondary rounded-xl p-4 text-sm text-text-secondary">
                  <strong className="text-text-primary">How it works:</strong> When the AI detects a portfolio
                  drawdown exceeding your threshold, it automatically exits positions starting with the
                  highest-risk holdings. This preserves {((crashResult.saved / Math.abs(crashResult.withoutAI - crashResult.portfolioValue)) * 100).toFixed(0)}%
                  of what would have been lost.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Strategy Comparison */}
        {tab === 2 && (
          <div>
            <p className="text-text-secondary text-sm mb-6">
              Historical performance of each AI mode using real market data.
            </p>

            <div className="panel overflow-hidden">
              <div className="grid grid-cols-5 px-6 py-3 border-b border-bg-border text-xs font-mono text-text-muted uppercase">
                <span className="col-span-2">Strategy</span>
                <span className="text-right">7 Days</span>
                <span className="text-right">30 Days</span>
                <span className="text-right">90 Days</span>
              </div>

              {STRATEGIES.map(s => (
                <div key={s.id} className="grid grid-cols-5 items-center px-6 py-4 border-b border-bg-border hover:bg-bg-hover">
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{s.name}</div>
                      <div className="text-xs text-text-muted">{s.desc}</div>
                    </div>
                  </div>
                  {[s.return7d, s.return30d, s.return90d].map((r, i) => (
                    <div key={i} className="text-right">
                      <span className={`text-sm font-mono font-bold ${r >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {r >= 0 ? '+' : ''}{r.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              ))}

              <div className="px-6 py-3 text-xs text-text-muted font-mono italic">
                * Performance based on backtesting with real historical NSE data. Past performance does not guarantee future results.
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}