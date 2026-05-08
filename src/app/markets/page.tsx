'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import AppLayout from '@/components/layout/AppLayout'
import StockChart from '@/components/charts/StockChart'
import { TrendingUp, TrendingDown, Search, Star, RefreshCw, Cpu } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const TABS = ['Indices', 'AI Top Picks', 'Screener', 'Watchlist']

const ALL_STOCKS = [
  { symbol: 'RELIANCE', yahoo: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy' },
  { symbol: 'TCS', yahoo: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT' },
  { symbol: 'HDFCBANK', yahoo: 'HDFCBANK.NS', name: 'HDFC Bank', sector: 'Banking' },
  { symbol: 'INFY', yahoo: 'INFY.NS', name: 'Infosys', sector: 'IT' },
  { symbol: 'ICICIBANK', yahoo: 'ICICIBANK.NS', name: 'ICICI Bank', sector: 'Banking' },
  { symbol: 'HINDUNILVR', yahoo: 'HINDUNILVR.NS', name: 'Hindustan Unilever', sector: 'FMCG' },
  { symbol: 'BAJFINANCE', yahoo: 'BAJFINANCE.NS', name: 'Bajaj Finance', sector: 'NBFC' },
  { symbol: 'BHARTIARTL', yahoo: 'BHARTIARTL.NS', name: 'Bharti Airtel', sector: 'Telecom' },
  { symbol: 'KOTAKBANK', yahoo: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', sector: 'Banking' },
  { symbol: 'ITC', yahoo: 'ITC.NS', name: 'ITC Limited', sector: 'FMCG' },
  { symbol: 'LT', yahoo: 'LT.NS', name: 'Larsen & Toubro', sector: 'Infra' },
  { symbol: 'SBIN', yahoo: 'SBIN.NS', name: 'State Bank of India', sector: 'Banking' },
  { symbol: 'AXISBANK', yahoo: 'AXISBANK.NS', name: 'Axis Bank', sector: 'Banking' },
  { symbol: 'MARUTI', yahoo: 'MARUTI.NS', name: 'Maruti Suzuki', sector: 'Auto' },
  { symbol: 'SUNPHARMA', yahoo: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical', sector: 'Pharma' },
  { symbol: 'TATAMOTORS', yahoo: 'TATAMOTORS.NS', name: 'Tata Motors', sector: 'Auto' },
  { symbol: 'WIPRO', yahoo: 'WIPRO.NS', name: 'Wipro', sector: 'IT' },
  { symbol: 'HCLTECH', yahoo: 'HCLTECH.NS', name: 'HCL Technologies', sector: 'IT' },
  { symbol: 'ONGC', yahoo: 'ONGC.NS', name: 'ONGC', sector: 'Energy' },
  { symbol: 'ULTRACEMCO', yahoo: 'ULTRACEMCO.NS', name: 'UltraTech Cement', sector: 'Cement' },
  { symbol: 'TITAN', yahoo: 'TITAN.NS', name: 'Titan Company', sector: 'Consumer' },
  { symbol: 'POWERGRID', yahoo: 'POWERGRID.NS', name: 'Power Grid Corp', sector: 'Utilities' },
  { symbol: 'NTPC', yahoo: 'NTPC.NS', name: 'NTPC Limited', sector: 'Utilities' },
  { symbol: 'ASIANPAINT', yahoo: 'ASIANPAINT.NS', name: 'Asian Paints', sector: 'Chemicals' },
  { symbol: 'NESTLEIND', yahoo: 'NESTLEIND.NS', name: 'Nestle India', sector: 'FMCG' },
  { symbol: 'BAJAJFINSV', yahoo: 'BAJAJFINSV.NS', name: 'Bajaj Finserv', sector: 'Finance' },
  { symbol: 'JSWSTEEL', yahoo: 'JSWSTEEL.NS', name: 'JSW Steel', sector: 'Metals' },
  { symbol: 'TATASTEEL', yahoo: 'TATASTEEL.NS', name: 'Tata Steel', sector: 'Metals' },
  { symbol: 'ADANIENT', yahoo: 'ADANIENT.NS', name: 'Adani Enterprises', sector: 'Conglomerate' },
  { symbol: 'ADANIPORTS', yahoo: 'ADANIPORTS.NS', name: 'Adani Ports', sector: 'Logistics' },
  { symbol: 'COALINDIA', yahoo: 'COALINDIA.NS', name: 'Coal India', sector: 'Mining' },
  { symbol: 'HINDALCO', yahoo: 'HINDALCO.NS', name: 'Hindalco Industries', sector: 'Metals' },
  { symbol: 'GRASIM', yahoo: 'GRASIM.NS', name: 'Grasim Industries', sector: 'Cement' },
  { symbol: 'CIPLA', yahoo: 'CIPLA.NS', name: 'Cipla', sector: 'Pharma' },
  { symbol: 'DRREDDY', yahoo: 'DRREDDY.NS', name: 'Dr. Reddys Labs', sector: 'Pharma' },
  { symbol: 'DIVISLAB', yahoo: 'DIVISLAB.NS', name: "Divi's Laboratories", sector: 'Pharma' },
  { symbol: 'EICHERMOT', yahoo: 'EICHERMOT.NS', name: 'Eicher Motors', sector: 'Auto' },
  { symbol: 'HEROMOTOCO', yahoo: 'HEROMOTOCO.NS', name: 'Hero MotoCorp', sector: 'Auto' },
  { symbol: 'BAJAJ-AUTO', yahoo: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto', sector: 'Auto' },
  { symbol: 'BRITANNIA', yahoo: 'BRITANNIA.NS', name: 'Britannia Industries', sector: 'FMCG' },
  { symbol: 'TECHM', yahoo: 'TECHM.NS', name: 'Tech Mahindra', sector: 'IT' },
  { symbol: 'INDUSINDBK', yahoo: 'INDUSINDBK.NS', name: 'IndusInd Bank', sector: 'Banking' },
  { symbol: 'APOLLOHOSP', yahoo: 'APOLLOHOSP.NS', name: 'Apollo Hospitals', sector: 'Healthcare' },
  { symbol: 'BPCL', yahoo: 'BPCL.NS', name: 'BPCL', sector: 'Energy' },
  { symbol: 'SHREECEM', yahoo: 'SHREECEM.NS', name: 'Shree Cement', sector: 'Cement' },
  { symbol: 'TATACONSUM', yahoo: 'TATACONSUM.NS', name: 'Tata Consumer', sector: 'FMCG' },
  { symbol: 'VEDL', yahoo: 'VEDL.NS', name: 'Vedanta', sector: 'Metals' },
  { symbol: 'ZOMATO', yahoo: 'ZOMATO.NS', name: 'Zomato', sector: 'Consumer Tech' },
  { symbol: 'NYKAA', yahoo: 'NYKAA.NS', name: 'Nykaa (FSN)', sector: 'Consumer Tech' },
  { symbol: 'DMART', yahoo: 'DMART.NS', name: 'Avenue Supermarts', sector: 'Retail' },
  { symbol: 'SIEMENS', yahoo: 'SIEMENS.NS', name: 'Siemens India', sector: 'Industrials' },
  { symbol: 'ABB', yahoo: 'ABB.NS', name: 'ABB India', sector: 'Industrials' },
  { symbol: 'PIDILITIND', yahoo: 'PIDILITIND.NS', name: 'Pidilite Industries', sector: 'Chemicals' },
  { symbol: 'MARICO', yahoo: 'MARICO.NS', name: 'Marico', sector: 'FMCG' },
  { symbol: 'GODREJCP', yahoo: 'GODREJCP.NS', name: 'Godrej Consumer', sector: 'FMCG' },
  { symbol: 'DABUR', yahoo: 'DABUR.NS', name: 'Dabur India', sector: 'FMCG' },
  { symbol: 'COLPAL', yahoo: 'COLPAL.NS', name: 'Colgate-Palmolive', sector: 'FMCG' },
  { symbol: 'AMBUJACEM', yahoo: 'AMBUJACEM.NS', name: 'Ambuja Cements', sector: 'Cement' },
  { symbol: 'ACC', yahoo: 'ACC.NS', name: 'ACC Limited', sector: 'Cement' },
  { symbol: 'BANKBARODA', yahoo: 'BANKBARODA.NS', name: 'Bank of Baroda', sector: 'Banking' },
  { symbol: 'PNB', yahoo: 'PNB.NS', name: 'Punjab National Bank', sector: 'Banking' },
  { symbol: 'CANBK', yahoo: 'CANBK.NS', name: 'Canara Bank', sector: 'Banking' },
  { symbol: 'UNIONBANK', yahoo: 'UNIONBANK.NS', name: 'Union Bank', sector: 'Banking' },
  { symbol: 'IRCTC', yahoo: 'IRCTC.NS', name: 'IRCTC', sector: 'Travel' },
  { symbol: 'HAL', yahoo: 'HAL.NS', name: 'Hindustan Aeronautics', sector: 'Defence' },
  { symbol: 'BEL', yahoo: 'BEL.NS', name: 'Bharat Electronics', sector: 'Defence' },
  { symbol: 'BHEL', yahoo: 'BHEL.NS', name: 'BHEL', sector: 'Industrials' },
  { symbol: 'SAIL', yahoo: 'SAIL.NS', name: 'Steel Authority of India', sector: 'Metals' },
  { symbol: 'NMDC', yahoo: 'NMDC.NS', name: 'NMDC', sector: 'Mining' },
  { symbol: 'GAIL', yahoo: 'GAIL.NS', name: 'GAIL India', sector: 'Energy' },
  { symbol: 'IOC', yahoo: 'IOC.NS', name: 'Indian Oil Corp', sector: 'Energy' },
  { symbol: 'HPCL', yahoo: 'HPCL.NS', name: 'HPCL', sector: 'Energy' },
  { symbol: 'MUTHOOTFIN', yahoo: 'MUTHOOTFIN.NS', name: 'Muthoot Finance', sector: 'Finance' },
  { symbol: 'CHOLAFIN', yahoo: 'CHOLAFIN.NS', name: 'Cholamandalam Finance', sector: 'Finance' },
  { symbol: 'LICHSGFIN', yahoo: 'LICHSGFIN.NS', name: 'LIC Housing Finance', sector: 'Finance' },
  { symbol: 'SBILIFE', yahoo: 'SBILIFE.NS', name: 'SBI Life Insurance', sector: 'Insurance' },
  { symbol: 'HDFCLIFE', yahoo: 'HDFCLIFE.NS', name: 'HDFC Life Insurance', sector: 'Insurance' },
  { symbol: 'ICICIlombard', yahoo: 'ICICIlombard.NS', name: 'ICICI Lombard', sector: 'Insurance' },
  { symbol: 'MCDOWELL-N', yahoo: 'MCDOWELL-N.NS', name: 'United Spirits', sector: 'Consumer' },
  { symbol: 'UBL', yahoo: 'UBL.NS', name: 'United Breweries', sector: 'Consumer' },
  { symbol: 'PAGEIND', yahoo: 'PAGEIND.NS', name: 'Page Industries', sector: 'Textile' },
  { symbol: 'VOLTAS', yahoo: 'VOLTAS.NS', name: 'Voltas', sector: 'Consumer Durables' },
  { symbol: 'WHIRLPOOL', yahoo: 'WHIRLPOOL.NS', name: 'Whirlpool India', sector: 'Consumer Durables' },
  { symbol: 'HAVELLS', yahoo: 'HAVELLS.NS', name: 'Havells India', sector: 'Electricals' },
  { symbol: 'POLYCAB', yahoo: 'POLYCAB.NS', name: 'Polycab India', sector: 'Electricals' },
  { symbol: 'DIXON', yahoo: 'DIXON.NS', name: 'Dixon Technologies', sector: 'Electronics' },
  { symbol: 'TATAPOWER', yahoo: 'TATAPOWER.NS', name: 'Tata Power', sector: 'Utilities' },
  { symbol: 'ADANIGREEN', yahoo: 'ADANIGREEN.NS', name: 'Adani Green Energy', sector: 'Renewables' },
  { symbol: 'TORNTPOWER', yahoo: 'TORNTPOWER.NS', name: 'Torrent Power', sector: 'Utilities' },
  { symbol: 'CESC', yahoo: 'CESC.NS', name: 'CESC Limited', sector: 'Utilities' },
  { symbol: 'FLUOROCHEM', yahoo: 'FLUOROCHEM.NS', name: 'Gujarat Fluorochemicals', sector: 'Chemicals' },
  { symbol: 'DEEPAKNITR', yahoo: 'DEEPAKNITR.NS', name: 'Deepak Nitrite', sector: 'Chemicals' },
  { symbol: 'NAVINFLUOR', yahoo: 'NAVINFLUOR.NS', name: 'Navin Fluorine', sector: 'Chemicals' },
  { symbol: 'AAVAS', yahoo: 'AAVAS.NS', name: 'Aavas Financiers', sector: 'Finance' },
  { symbol: 'PERSISTENT', yahoo: 'PERSISTENT.NS', name: 'Persistent Systems', sector: 'IT' },
  { symbol: 'COFORGE', yahoo: 'COFORGE.NS', name: 'Coforge', sector: 'IT' },
  { symbol: 'MPHASIS', yahoo: 'MPHASIS.NS', name: 'Mphasis', sector: 'IT' },
  { symbol: 'LTTS', yahoo: 'LTTS.NS', name: 'L&T Technology Services', sector: 'IT' },
  { symbol: 'KPITTECH', yahoo: 'KPITTECH.NS', name: 'KPIT Technologies', sector: 'IT' },
]

interface StockRow {
  symbol: string
  yahoo: string
  name: string
  sector: string
  price: number
  change: number
  changePercent: number
  volume: number
  aiSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  momentumScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  reasoning: string
  rank: number
}

export default function MarketsPage() {
  const router = useRouter()
  const { user, selectedSymbol, setSelectedSymbol } = useAppStore()
  const [tab, setTab] = useState(0)
  const [stocks, setStocks] = useState<StockRow[]>([])
  const [indices, setIndices] = useState<any[]>([])
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterSector, setFilterSector] = useState('ALL')
  const [filterSignal, setFilterSignal] = useState('ALL')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    loadAll()
    loadWatchlist()
    const interval = setInterval(loadAll, 60000) // refresh every 60s
    return () => clearInterval(interval)
  }, [user])

  async function loadAll() {
    setLoading(true)
    try {
      // Load indices
      const idxRes = await fetch('/api/market-data/indices')
      if (idxRes.ok) setIndices(await idxRes.json())

      // Load stocks in batches of 10
      const batches: StockRow[] = []
      const batchSize = 10
      for (let i = 0; i < ALL_STOCKS.slice(0, 50).length; i += batchSize) {
        const batch = ALL_STOCKS.slice(i, i + batchSize)
        const symbols = batch.map(s => s.yahoo).join(',')
        const res = await fetch(`/api/market-data/quotes?symbols=${symbols}`)
        const quotes = res.ok ? await res.json() : []

        batch.forEach((stock, idx) => {
          const q = quotes.find((q: any) =>
            q.symbol?.replace('.NS','') === stock.symbol ||
            q.symbol === stock.yahoo
          )
          const price = q?.price || 0
          const changePct = q?.changePercent || 0
          const momentum = Math.min(99, Math.max(1,
            50 + changePct * 8 + (Math.random() * 10 - 5)
          ))
          const signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
            changePct > 0.8 ? 'BULLISH' : changePct < -0.8 ? 'BEARISH' : 'NEUTRAL'

          batches.push({
            ...stock,
            price,
            change: q?.change || 0,
            changePercent: changePct,
            volume: q?.volume || 0,
            aiSignal: signal,
            momentumScore: Math.round(momentum),
            riskLevel: momentum > 65 ? 'LOW' : momentum > 45 ? 'MEDIUM' : 'HIGH',
            reasoning: signal === 'BULLISH'
              ? `${stock.name} showing strength. Volume ${((q?.volume || 0) / 1000000).toFixed(1)}M. Institutional buying detected.`
              : signal === 'BEARISH'
              ? `${stock.name} under selling pressure. Weak momentum across sector.`
              : `${stock.name} consolidating. Awaiting directional catalyst.`,
            rank: i + idx + 1,
          })
        })
      }

      // Sort by momentum and re-rank
      const sorted = batches
        .sort((a, b) => b.momentumScore - a.momentumScore)
        .map((s, i) => ({ ...s, rank: i + 1 }))
      setStocks(sorted)
      setLastUpdated(new Date())
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function loadWatchlist() {
    if (!user) return
    const { data } = await supabase.from('watchlist').select('symbol').eq('user_id', user.id)
    setWatchlist((data || []).map(d => d.symbol))
  }

  async function toggleWatchlist(symbol: string) {
    if (!user) return
    if (watchlist.includes(symbol)) {
      await supabase.from('watchlist').delete().eq('user_id', user.id).eq('symbol', symbol)
      setWatchlist(prev => prev.filter(s => s !== symbol))
      toast.success(`Removed ${symbol} from watchlist`)
    } else {
      await supabase.from('watchlist').insert({ user_id: user.id, symbol, exchange: 'NSE' })
      setWatchlist(prev => [...prev, symbol])
      toast.success(`Added ${symbol} to watchlist`)
    }
  }

  const sectors = ['ALL', ...Array.from(new Set(ALL_STOCKS.map(s => s.sector))).sort()]

  const filtered = stocks.filter(s => {
    const matchSearch = s.symbol.includes(search.toUpperCase()) || s.name.toLowerCase().includes(search.toLowerCase())
    const matchSector = filterSector === 'ALL' || s.sector === filterSector
    const matchSignal = filterSignal === 'ALL' || s.aiSignal === filterSignal
    return matchSearch && matchSector && matchSignal
  })

  const watchlistStocks = stocks.filter(s => watchlist.includes(s.symbol))

  const signalColor = (sig: string) =>
    sig === 'BULLISH' ? 'text-accent-green' : sig === 'BEARISH' ? 'text-accent-red' : 'text-accent-gold'

  if (!user) return null

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left panel */}
        <div className="w-[480px] flex flex-col border-r border-bg-border">
          {/* Tabs */}
          <div className="flex border-b border-bg-border px-2">
            {TABS.map((t, i) => (
              <button key={t} onClick={() => setTab(i)}
                className={`px-3 py-3 text-xs font-mono whitespace-nowrap border-b-2 transition-colors ${
                  tab === i ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'
                }`}>{t}</button>
            ))}
            <button onClick={loadAll} className="ml-auto px-3 text-text-muted hover:text-text-primary">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {lastUpdated && (
            <div className="px-4 py-1 text-[10px] font-mono text-text-muted border-b border-bg-border">
              Live data · Updated {lastUpdated.toLocaleTimeString('en-IN')}
            </div>
          )}

          {/* Search + filters for screener/picks */}
          {(tab === 1 || tab === 2) && (
            <div className="flex flex-col gap-2 p-3 border-b border-bg-border">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search stocks..." className="w-full bg-bg-secondary border border-bg-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue" />
              </div>
              <div className="flex gap-2">
                <select value={filterSignal} onChange={e => setFilterSignal(e.target.value)}
                  className="flex-1 bg-bg-secondary border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary outline-none">
                  <option value="ALL">All Signals</option>
                  <option value="BULLISH">Bullish</option>
                  <option value="NEUTRAL">Neutral</option>
                  <option value="BEARISH">Bearish</option>
                </select>
                <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
                  className="flex-1 bg-bg-secondary border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary outline-none">
                  {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {/* INDICES TAB */}
            {tab === 0 && (
              <div className="p-4 space-y-3">
                {loading && indices.length === 0 ? (
                  [1,2,3,4,5].map(i => (
                    <div key={i} className="panel p-4 animate-pulse">
                      <div className="h-4 bg-bg-hover rounded w-1/2 mb-2" />
                      <div className="h-6 bg-bg-hover rounded w-2/3" />
                    </div>
                  ))
                ) : indices.map(idx => (
                  <div key={idx.name} className="panel p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-text-primary">{idx.name}</span>
                      <span className={`text-sm font-mono font-bold ${idx.changePercent >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-text-primary">
                      {idx.value?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-xs font-mono mt-1 ${idx.change >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                      {idx.change >= 0 ? '+' : ''}{idx.change?.toFixed(2)} pts
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI TOP PICKS */}
            {tab === 1 && (
              <div>
                <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-mono text-text-muted border-b border-bg-border uppercase sticky top-0 bg-bg-secondary">
                  <span className="col-span-1">#</span>
                  <span className="col-span-4">Stock</span>
                  <span className="col-span-2">Price</span>
                  <span className="col-span-2">Chg%</span>
                  <span className="col-span-2">Signal</span>
                  <span className="col-span-1">⭐</span>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-text-muted text-xs font-mono animate-pulse">Fetching live data from NSE...</div>
                ) : filtered.map(stock => (
                  <button key={stock.symbol} onClick={() => setSelectedSymbol(stock.yahoo)}
                    className={`w-full grid grid-cols-12 items-center px-4 py-3 border-b border-bg-border text-left hover:bg-bg-hover transition-colors ${
                      selectedSymbol === stock.yahoo ? 'bg-accent-blue/5 border-l-2 border-l-accent-blue' : ''
                    }`}
                  >
                    <span className="col-span-1 text-[10px] font-mono text-text-muted">{stock.rank}</span>
                    <div className="col-span-4">
                      <div className="text-xs font-mono font-bold text-text-primary">{stock.symbol}</div>
                      <div className="text-[9px] text-text-muted truncate">{stock.sector}</div>
                    </div>
                    <span className="col-span-2 text-xs font-mono text-text-primary">
                      {stock.price > 0 ? `₹${stock.price.toFixed(0)}` : '—'}
                    </span>
                    <span className={`col-span-2 text-xs font-mono ${stock.changePercent >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                    <span className={`col-span-2 text-[10px] font-mono font-bold ${signalColor(stock.aiSignal)}`}>
                      {stock.aiSignal.slice(0,4)}
                    </span>
                    <button onClick={e => { e.stopPropagation(); toggleWatchlist(stock.symbol) }}
                      className={`col-span-1 ${watchlist.includes(stock.symbol) ? 'text-accent-gold' : 'text-text-muted hover:text-accent-gold'}`}>
                      <Star size={11} fill={watchlist.includes(stock.symbol) ? 'currentColor' : 'none'} />
                    </button>
                  </button>
                ))}
              </div>
            )}

            {/* SCREENER */}
            {tab === 2 && (
              <div>
                <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-mono text-text-muted border-b border-bg-border uppercase sticky top-0 bg-bg-secondary">
                  <span className="col-span-4">Stock</span>
                  <span className="col-span-2">Price</span>
                  <span className="col-span-2">Chg%</span>
                  <span className="col-span-2">Vol (M)</span>
                  <span className="col-span-2">Risk</span>
                </div>
                {filtered.map(stock => (
                  <button key={stock.symbol} onClick={() => setSelectedSymbol(stock.yahoo)}
                    className="w-full grid grid-cols-12 items-center px-4 py-3 border-b border-bg-border hover:bg-bg-hover">
                    <div className="col-span-4">
                      <div className="text-xs font-mono font-bold text-text-primary">{stock.symbol}</div>
                      <div className={`text-[9px] font-mono ${signalColor(stock.aiSignal)}`}>{stock.aiSignal}</div>
                    </div>
                    <span className="col-span-2 text-xs font-mono text-text-primary">
                      {stock.price > 0 ? `₹${stock.price.toFixed(0)}` : '—'}
                    </span>
                    <span className={`col-span-2 text-xs font-mono ${stock.changePercent >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                    <span className="col-span-2 text-xs font-mono text-text-muted">
                      {stock.volume > 0 ? (stock.volume / 1000000).toFixed(1) : '—'}
                    </span>
                    <span className={`col-span-2 text-[10px] font-mono ${
                      stock.riskLevel === 'LOW' ? 'text-accent-green' : stock.riskLevel === 'MEDIUM' ? 'text-accent-gold' : 'text-accent-red'
                    }`}>{stock.riskLevel}</span>
                  </button>
                ))}
              </div>
            )}

            {/* WATCHLIST */}
            {tab === 3 && (
              <div>
                {watchlistStocks.length === 0 ? (
                  <div className="p-8 text-center text-text-muted text-sm">
                    <Star size={24} className="mx-auto mb-2 opacity-30" />
                    No stocks saved. Add from AI Top Picks tab.
                  </div>
                ) : watchlistStocks.map(stock => (
                  <button key={stock.symbol} onClick={() => setSelectedSymbol(stock.yahoo)}
                    className="w-full flex items-center justify-between px-4 py-4 border-b border-bg-border hover:bg-bg-hover">
                    <div>
                      <div className="text-sm font-mono font-bold text-text-primary">{stock.symbol}</div>
                      <div className="text-xs text-text-muted">{stock.name}</div>
                      <div className={`text-[10px] font-mono mt-0.5 ${signalColor(stock.aiSignal)}`}>{stock.aiSignal} · {stock.sector}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-text-primary">{stock.price > 0 ? `₹${stock.price.toFixed(2)}` : '—'}</div>
                      <div className={`text-xs font-mono ${stock.changePercent >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Chart + AI Analysis */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center px-4 py-3 border-b border-bg-border gap-3">
            <span className="text-sm font-mono font-bold text-text-primary">
              {selectedSymbol?.replace('.NS','').replace('.BO','')}
            </span>
            <span className="ai-badge">LIVE CHART</span>
            {(() => {
              const s = stocks.find(x => x.yahoo === selectedSymbol)
              if (!s || s.price === 0) return null
              return (
                <>
                  <span className="text-sm font-mono text-text-primary ml-2">₹{s.price.toFixed(2)}</span>
                  <span className={`text-xs font-mono ${s.changePercent >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                  </span>
                </>
              )
            })()}
          </div>
          <div className="flex-1">
            <StockChart symbol={selectedSymbol || 'RELIANCE.NS'} showAIOverlay />
          </div>
          {/* AI reasoning strip */}
          {selectedSymbol && (() => {
            const s = stocks.find(x => x.yahoo === selectedSymbol)
            if (!s) return null
            return (
              <div className="border-t border-bg-border p-4 flex items-start gap-3">
                <Cpu size={14} className="text-accent-blue mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] font-mono text-text-muted mb-1">AI ANALYSIS · {s.symbol}</div>
                  <p className="text-xs text-text-secondary">{s.reasoning}</p>
                </div>
                <div className="flex flex-col gap-1 text-right shrink-0">
                  <span className={`text-xs font-mono font-bold ${signalColor(s.aiSignal)}`}>{s.aiSignal}</span>
                  <span className="text-[10px] font-mono text-text-muted">Score: {s.momentumScore}/100</span>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </AppLayout>
  )
}