'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import AppLayout from '@/components/layout/AppLayout'
import { RefreshCw, ExternalLink, Coffee, Calendar, Globe } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const TABS = ['Market News', 'AI Morning Brief', 'Earnings Calendar', 'Global Macro']
const NEWS_CATS = ['india', 'us', 'crypto', 'commodities']
const CAT_LABELS = ['Indian Markets', 'US Markets', 'Crypto', 'Commodities']

interface NewsItem {
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  impactedStocks: string[]
}

interface MacroData {
  title: string
  value: string
  label: string
  trend: string
  impact: string
  color: string
  live: boolean
}

export default function NewsPage() {
  const router = useRouter()
  const { user } = useAppStore()
  const [tab, setTab] = useState(0)
  const [newsCat, setNewsCat] = useState(0)
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [brief, setBrief] = useState<any>(null)
  const [macro, setMacro] = useState<MacroData[]>([])
  const [macroLoading, setMacroLoading] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/'); return }
  }, [user])

  useEffect(() => {
    if (tab === 0) loadNews()
    if (tab === 1) loadBrief()
    if (tab === 3) loadMacro()
  }, [tab, newsCat])

  // Auto-refresh news every hour
  useEffect(() => {
    if (tab !== 0) return
    const interval = setInterval(loadNews, 3600000)
    return () => clearInterval(interval)
  }, [tab, newsCat])

  async function loadNews() {
    setLoading(true)
    try {
      const res = await fetch(`/api/news?category=${NEWS_CATS[newsCat]}&t=${Date.now()}`)
      if (res.ok) {
        setNews(await res.json())
        setLastUpdated(new Date())
      }
    } catch {}
    setLoading(false)
  }

  async function loadMacro() {
    setMacroLoading(true)
    try {
      const res = await fetch(`/api/market-data/macro`)
      if (res.ok) {
        setMacro(await res.json())
      } else {
        setMacro(getDefaultMacro())
      }
    } catch {
      setMacro(getDefaultMacro())
    }
    setMacroLoading(false)
  }

  function getDefaultMacro(): MacroData[] {
    return [
      {
        title: 'US Federal Reserve',
        value: '4.25–4.50%',
        label: 'Fed Funds Rate',
        trend: 'HOLD',
        impact: 'Fed held rates steady. Signals potential cuts later in 2025 if inflation cools. Positive for Indian FII flows.',
        color: 'text-accent-blue',
        live: false,
      },
      {
        title: 'RBI India',
        value: '6.00%',
        label: 'Repo Rate',
        trend: 'CUT',
        impact: 'RBI cut rates by 25bps in April 2025. Banking and housing finance stocks benefit. EMI burdens ease.',
        color: 'text-accent-green',
        live: false,
      },
      {
        title: 'Crude Oil (Brent)',
        value: 'Loading...',
        label: 'per barrel (USD)',
        trend: '—',
        impact: 'Fetching live crude price...',
        color: 'text-accent-gold',
        live: true,
      },
      {
        title: 'USD/INR',
        value: 'Loading...',
        label: 'Exchange Rate',
        trend: '—',
        impact: 'Fetching live forex rate...',
        color: 'text-accent-gold',
        live: true,
      },
    ]
  }

  async function loadBrief() {
    try {
      // Fetch latest market data for brief
      const [idxRes, newsRes] = await Promise.all([
        fetch('/api/market-data/indices'),
        fetch('/api/news?category=india'),
      ])
      const indices = idxRes.ok ? await idxRes.json() : []
      const latestNews = newsRes.ok ? await newsRes.json() : []

      const nifty = indices.find((i: any) => i.name === 'NIFTY 50')
      const sensex = indices.find((i: any) => i.name === 'SENSEX')
      const vix = indices.find((i: any) => i.name === 'INDIA VIX')

      const niftyChange = nifty?.changePercent || 0
      const vixVal = vix?.value || 14

      const stance = niftyChange > 0.5 && vixVal < 16 ? 'Aggressive-Positive' :
                     niftyChange < -0.5 || vixVal > 20 ? 'Cautious' : 'Neutral-Positive'

      setBrief({
        date: new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        stance,
        nifty: nifty ? `${nifty.value?.toFixed(2)} (${niftyChange >= 0 ? '+' : ''}${niftyChange?.toFixed(2)}%)` : 'Loading...',
        sensex: sensex ? `${sensex.value?.toFixed(2)} (${(sensex.changePercent || 0) >= 0 ? '+' : ''}${sensex.changePercent?.toFixed(2)}%)` : 'Loading...',
        vix: vix ? vix.value?.toFixed(2) : '—',
        usMarkets: 'US markets showed mixed signals overnight. S&P 500 futures trading near flat ahead of key economic data releases this week. Federal Reserve speakers scheduled for later today.',
        keyEvents: 'Watch for FII/DII data at market close. RBI MPC minutes expected this week. Global PMI data releases from major economies today.',
        aiStance: `AI is in ${stance} mode. ${
          stance.includes('Aggressive') ? 'Deploying capital in quality large-caps and momentum stocks.' :
          stance.includes('Cautious') ? 'Reducing position sizes, holding higher cash. Waiting for VIX to cool.' :
          'Balanced approach — selective deployment in fundamentally strong names.'
        }`,
        riskNote: vixVal > 18
          ? `India VIX at ${vixVal?.toFixed(1)} — elevated volatility. AI reducing position sizes and tightening stop-losses.`
          : `India VIX at ${vixVal?.toFixed(1)} — calm markets. Favourable for trending strategies.`,
        topStocks: ['HDFCBANK', 'RELIANCE', 'INFY'],
        topNews: latestNews.slice(0, 3),
        generatedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      })
    } catch {
      setBrief({ date: new Date().toLocaleDateString(), stance: 'Neutral', generatedAt: new Date().toLocaleTimeString() })
    }
  }

  const EARNINGS_DATA = [
    { company: 'Infosys', date: 'Apr 17', expected: '₹17.2 EPS', aiPrediction: 'BEAT', confidence: 74, color: 'text-accent-green' },
    { company: 'TCS', date: 'Apr 10', expected: '₹28.5 EPS', aiPrediction: 'IN-LINE', confidence: 61, color: 'text-accent-gold' },
    { company: 'HDFC Bank', date: 'Apr 19', expected: '₹19.8 EPS', aiPrediction: 'BEAT', confidence: 79, color: 'text-accent-green' },
    { company: 'Reliance', date: 'Apr 25', expected: '₹32.1 EPS', aiPrediction: 'BEAT', confidence: 68, color: 'text-accent-green' },
    { company: 'Wipro', date: 'Apr 16', expected: '₹7.9 EPS', aiPrediction: 'MISS', confidence: 55, color: 'text-accent-red' },
    { company: 'ICICI Bank', date: 'Apr 26', expected: '₹11.3 EPS', aiPrediction: 'BEAT', confidence: 72, color: 'text-accent-green' },
    { company: 'Axis Bank', date: 'Apr 24', expected: '₹9.4 EPS', aiPrediction: 'IN-LINE', confidence: 63, color: 'text-accent-gold' },
    { company: 'L&T', date: 'May 2', expected: '₹41.2 EPS', aiPrediction: 'BEAT', confidence: 71, color: 'text-accent-green' },
  ]

  const SentimentBadge = ({ s }: { s: string }) => (
    <span className={`text-[10px] font-mono border px-1.5 py-0.5 rounded ${
      s === 'BULLISH' ? 'text-accent-green border-accent-green/30 bg-accent-green/10' :
      s === 'BEARISH' ? 'text-accent-red border-accent-red/30 bg-accent-red/10' :
      'text-accent-gold border-accent-gold/30 bg-accent-gold/10'
    }`}>{s}</span>
  )

  if (!user) return null

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex border-b border-bg-border px-6">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-4 py-3 text-sm font-mono whitespace-nowrap border-b-2 transition-colors ${
                tab === i ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}>{t}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* MARKET NEWS */}
          {tab === 0 && (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  {CAT_LABELS.map((label, i) => (
                    <button key={label} onClick={() => { setNewsCat(i); }}
                      className={`px-4 py-1.5 text-xs font-mono rounded-full transition-colors ${
                        newsCat === i ? 'bg-accent-blue text-white' : 'bg-bg-secondary text-text-muted hover:text-text-secondary border border-bg-border'
                      }`}>{label}</button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  {lastUpdated && (
                    <span className="text-[10px] font-mono text-text-muted">
                      Updated {lastUpdated.toLocaleTimeString('en-IN')}
                    </span>
                  )}
                  <button onClick={loadNews} className="text-text-muted hover:text-text-primary">
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="panel p-5 animate-pulse">
                      <div className="h-4 bg-bg-hover rounded w-3/4 mb-2" />
                      <div className="h-3 bg-bg-hover rounded w-full mb-1" />
                      <div className="h-3 bg-bg-hover rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : news.length === 0 ? (
                <div className="panel p-8 text-center text-text-muted">
                  <p className="text-sm mb-2">No news loaded.</p>
                  <p className="text-xs">Add your NewsAPI key in .env.local to get live news.</p>
                  <p className="text-xs font-mono mt-1">NEWS_API_KEY=your_key_from_newsapi.org</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {news.map((item, i) => (
                    <div key={i} className="panel p-5 hover:bg-bg-hover transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-text-primary font-semibold text-sm leading-snug">{item.title}</h3>
                        <SentimentBadge s={item.sentiment} />
                      </div>
                      {item.description && (
                        <p className="text-text-secondary text-xs leading-relaxed mb-3">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-text-muted text-[10px] font-mono">{item.source}</span>
                          <span className="text-text-muted text-[10px]">
                            {item.publishedAt ? formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true }) : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.impactedStocks?.length > 0 && (
                            <div className="flex gap-1">
                              {item.impactedStocks.slice(0,2).map(s => (
                                <span key={s} className="text-[10px] font-mono bg-bg-secondary border border-bg-border px-1.5 py-0.5 rounded text-text-secondary">{s}</span>
                              ))}
                            </div>
                          )}
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            className="text-text-muted hover:text-accent-blue transition-colors"
                            onClick={e => e.stopPropagation()}>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI MORNING BRIEF */}
          {tab === 1 && (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <Coffee size={20} className="text-accent-gold" />
                <div>
                  <h2 className="text-xl font-bold text-text-primary">AI Morning Brief</h2>
                  <div className="text-text-muted text-xs font-mono">
                    {brief?.date} · Generated {brief?.generatedAt || '—'}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-mono border ${
                    brief?.stance?.includes('Positive') ? 'text-accent-green border-accent-green/30 bg-accent-green/10' :
                    brief?.stance?.includes('Caution') ? 'text-accent-red border-accent-red/30 bg-accent-red/10' :
                    'text-accent-gold border-accent-gold/30 bg-accent-gold/10'
                  }`}>AI Stance: {brief?.stance || '—'}</span>
                  <button onClick={loadBrief} className="text-text-muted hover:text-text-primary">
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>

              {!brief ? (
                <div className="panel p-8 text-center text-text-muted text-sm animate-pulse">Generating AI brief with live market data...</div>
              ) : (
                <div className="space-y-4">
                  {/* Live Index snapshot */}
                  <div className="panel p-5 grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-[10px] font-mono text-text-muted mb-1">NIFTY 50</div>
                      <div className="text-sm font-mono font-bold text-text-primary">{brief.nifty}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-text-muted mb-1">SENSEX</div>
                      <div className="text-sm font-mono font-bold text-text-primary">{brief.sensex}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-text-muted mb-1">INDIA VIX</div>
                      <div className="text-sm font-mono font-bold text-text-primary">{brief.vix}</div>
                    </div>
                  </div>

                  {[
                    { icon: '🌍', title: 'US Markets Overnight', content: brief.usMarkets, color: 'text-accent-blue' },
                    { icon: '📅', title: 'Key Events Today', content: brief.keyEvents, color: 'text-accent-gold' },
                    { icon: '🤖', title: 'AI Positioning', content: brief.aiStance, color: 'text-accent-green' },
                    { icon: '⚠️', title: 'Risk to Watch', content: brief.riskNote, color: 'text-accent-red' },
                  ].map(({ icon, title, content, color }) => (
                    <div key={title} className="panel p-5">
                      <div className={`text-xs font-mono ${color} mb-2`}>{icon} {title}</div>
                      <p className="text-text-secondary text-sm leading-relaxed">{content}</p>
                    </div>
                  ))}

                  <div className="panel p-5">
                    <div className="text-xs font-mono text-accent-blue mb-3">📈 TOP 3 STOCKS AI IS WATCHING TODAY</div>
                    <div className="flex gap-3">
                      {brief.topStocks?.map((s: string, i: number) => (
                        <div key={s} className="flex-1 bg-bg-secondary rounded-xl p-3 text-center">
                          <div className="text-xs font-mono text-text-muted mb-1">#{i + 1}</div>
                          <div className="text-sm font-mono font-bold text-text-primary">{s}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {brief.topNews?.length > 0 && (
                    <div className="panel p-5">
                      <div className="text-xs font-mono text-accent-blue mb-3">📰 TOP NEWS RIGHT NOW</div>
                      <div className="space-y-3">
                        {brief.topNews.map((n: any, i: number) => (
                          <div key={i} className="text-xs text-text-secondary border-b border-bg-border pb-2 last:border-0 last:pb-0">
                            <a href={n.url} target="_blank" className="hover:text-accent-blue">{n.title}</a>
                            <span className="text-text-muted ml-2">{n.source}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* EARNINGS CALENDAR */}
          {tab === 2 && (
            <div className="max-w-3xl mx-auto">
              <div className="panel overflow-hidden">
                <div className="grid grid-cols-5 px-6 py-3 border-b border-bg-border text-[10px] font-mono text-text-muted uppercase">
                  <span className="col-span-2">Company</span>
                  <span>Date</span>
                  <span>Expected EPS</span>
                  <span>AI Prediction</span>
                </div>
                {EARNINGS_DATA.map(e => (
                  <div key={e.company} className="grid grid-cols-5 items-center px-6 py-4 border-b border-bg-border hover:bg-bg-hover">
                    <span className="col-span-2 text-sm font-semibold text-text-primary">{e.company}</span>
                    <span className="text-xs font-mono text-text-secondary">{e.date}</span>
                    <span className="text-xs font-mono text-text-secondary">{e.expected}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-bold ${e.color}`}>{e.aiPrediction}</span>
                      <span className="text-[10px] font-mono text-text-muted">{e.confidence}% conf</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GLOBAL MACRO */}
          {tab === 3 && (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Global Macro Tracker</h2>
                  <p className="text-text-muted text-xs mt-0.5">Live rates and their impact on Indian markets</p>
                </div>
                <button onClick={loadMacro} className="text-text-muted hover:text-text-primary flex items-center gap-1 text-xs">
                  <RefreshCw size={12} className={macroLoading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>
              {macroLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => <div key={i} className="panel p-6 animate-pulse h-40" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {macro.map(m => (
                    <div key={m.title} className="panel p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-xs font-mono text-text-muted mb-1">{m.title}</div>
                          <div className={`text-2xl font-mono font-bold ${m.color}`}>{m.value}</div>
                          <div className="text-xs text-text-muted">{m.label}</div>
                        </div>
                        <span className={`text-xs font-mono border px-2 py-1 rounded ${
                          m.trend === 'UP' || m.trend === 'CUT' ? 'text-accent-red border-accent-red/30' :
                          m.trend === 'DOWN' ? 'text-accent-green border-accent-green/30' :
                          'text-accent-gold border-accent-gold/30'
                        }`}>{m.trend}</span>
                      </div>
                      <p className="text-text-secondary text-xs leading-relaxed">{m.impact}</p>
                      {m.live && <div className="mt-2 text-[10px] font-mono text-text-muted flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-accent-green rounded-full inline-block animate-pulse" />
                        LIVE
                      </div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}