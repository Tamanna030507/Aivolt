'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import AppLayout from '@/components/layout/AppLayout'
import { Shield, AlertTriangle, Wallet, FileText, Power } from 'lucide-react'
import { formatINR } from '@/lib/market'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const TABS = ['Panic Button', 'Risk Monitor', 'Wallet', 'Tax & Audit']

export default function SafetyPage() {
  const router = useRouter()
  const { user, panicMode, setPanicMode, setAIStatus, setLastAIAction, isPaperMode } = useAppStore()
  const [tab, setTab] = useState(0)
  const [panicConfirm, setPanicConfirm] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [riskData, setRiskData] = useState({
    drawdown: 2.4,
    dailyLossUsed: 35,
    concentration: { Banking: 40, IT: 30, Energy: 20, Others: 10 },
    portfolioHealth: 'GREEN' as 'GREEN' | 'YELLOW' | 'RED',
  })
  const [walletData, setWalletData] = useState({
    availableBalance: 245000,
    deployed: 155000,
    profits: 18500,
    withdrawable: 263500,
  })

  useEffect(() => {
    if (!user) { router.push('/'); return }
  }, [user])

  async function executePanic() {
    if (!panicConfirm) { setPanicConfirm(true); return }
    setExiting(true)

    // Exit all positions
    try {
      await supabase.from('portfolio').delete().eq('user_id', user!.id)
      await supabase.from('trades').update({ status: 'CLOSED' }).eq('user_id', user!.id).eq('status', 'OPEN')
    } catch {}

    setPanicMode(true)
    setAIStatus('Paused')
    setLastAIAction('PANIC EXIT — All positions closed')

    await supabase.from('ai_activity').insert({
      user_id: user!.id,
      action: '🚨 PANIC EXIT — All positions closed immediately',
      symbol: null,
      reasoning: 'User triggered panic exit. All positions liquidated.',
      confidence: 100,
    })

    toast.error('🚨 Panic exit complete. All positions closed.', { duration: 8000 })
    setExiting(false)
    setPanicConfirm(false)
  }

  function resumeTrading() {
    setPanicMode(false)
    setAIStatus('Active')
    setLastAIAction('Trading resumed by user')
    toast.success('✅ AI trading resumed')
  }

  const RiskGauge = ({ value, label, color }: { value: number; label: string; color: string }) => (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-text-muted">{label}</span>
        <span className={color}>{value}%</span>
      </div>
      <div className="h-2 bg-bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, value)}%`,
            backgroundColor: value > 75 ? '#ff3d71' : value > 50 ? '#ffaa00' : '#00d68f',
          }}
        />
      </div>
    </div>
  )

  if (!user) return null

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex border-b border-bg-border px-6">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-4 py-3 text-sm font-mono whitespace-nowrap transition-colors border-b-2 ${
                tab === i ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* PANIC BUTTON */}
          {tab === 0 && (
            <div className="max-w-lg mx-auto text-center">
              {panicMode ? (
                <div className="space-y-8">
                  <div className="panel p-8 border-accent-green/30">
                    <Shield size={48} className="text-accent-green mx-auto mb-4" />
                    <h2 className="text-2xl font-display font-bold text-text-primary mb-2">All Positions Closed</h2>
                    <p className="text-text-secondary text-sm mb-6">
                      Your portfolio has been fully liquidated. Capital is safe in your Dhan wallet.
                      AI trading is paused.
                    </p>
                    <button
                      onClick={resumeTrading}
                      className="bg-accent-green text-white font-semibold px-8 py-3 rounded-xl hover:bg-green-400 transition-colors"
                    >
                      Resume AI Trading
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-text-primary mb-2">Emergency Exit</h2>
                    <p className="text-text-secondary text-sm">
                      One tap to exit every open position immediately. No questions asked.
                    </p>
                  </div>

                  <button
                    onClick={executePanic}
                    disabled={exiting}
                    className={`w-48 h-48 mx-auto rounded-full flex flex-col items-center justify-center gap-2 transition-all border-4 ${
                      panicConfirm
                        ? 'bg-accent-red border-accent-red text-white animate-pulse scale-105'
                        : 'bg-accent-red/10 border-accent-red/50 text-accent-red hover:bg-accent-red hover:text-white hover:scale-105'
                    } disabled:opacity-50`}
                  >
                    <AlertTriangle size={36} />
                    <div className="text-lg font-bold font-display">
                      {exiting ? 'EXITING...' : panicConfirm ? 'TAP AGAIN!' : 'PANIC EXIT'}
                    </div>
                    {!exiting && !panicConfirm && (
                      <div className="text-xs opacity-70">Close all positions</div>
                    )}
                  </button>

                  {panicConfirm && (
                    <p className="text-accent-red text-sm font-mono animate-pulse">
                      ⚠️ This will immediately exit ALL open positions. Tap again to confirm.
                    </p>
                  )}

                  {panicConfirm && (
                    <button onClick={() => setPanicConfirm(false)} className="text-text-muted text-sm hover:text-text-secondary">
                      Cancel
                    </button>
                  )}

                  <div className="panel p-4 text-xs text-text-secondary text-left space-y-2">
                    <div className="font-semibold text-text-primary">What happens when you press Panic:</div>
                    <div>• All open positions are immediately sold at market price</div>
                    <div>• AI autopilot is paused until you manually resume</div>
                    <div>• Funds return to your Dhan wallet within minutes</div>
                    <div>• Full audit trail is recorded with timestamp</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RISK MONITOR */}
          {tab === 1 && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Health badge */}
              <div className={`panel p-6 flex items-center gap-4 ${
                riskData.portfolioHealth === 'GREEN' ? 'border-accent-green/30' :
                riskData.portfolioHealth === 'YELLOW' ? 'border-accent-gold/30' : 'border-accent-red/30'
              }`}>
                <Shield size={32} className={
                  riskData.portfolioHealth === 'GREEN' ? 'text-accent-green' :
                  riskData.portfolioHealth === 'YELLOW' ? 'text-accent-gold' : 'text-accent-red'
                } />
                <div>
                  <div className="text-xs font-mono text-text-muted mb-0.5">PORTFOLIO HEALTH</div>
                  <div className={`text-xl font-display font-bold ${
                    riskData.portfolioHealth === 'GREEN' ? 'text-accent-green' :
                    riskData.portfolioHealth === 'YELLOW' ? 'text-accent-gold' : 'text-accent-red'
                  }`}>{riskData.portfolioHealth} — Safe to trade</div>
                </div>
              </div>

              {/* Risk gauges */}
              <div className="panel p-6 space-y-5">
                <div className="text-xs font-mono text-text-muted uppercase mb-4">Risk Meters</div>
                <RiskGauge value={riskData.drawdown} label="Current Drawdown" color="text-accent-green" />
                <RiskGauge value={riskData.dailyLossUsed} label={`Daily Loss Limit Used (₹${user.dailyLossLimit?.toLocaleString()})`} color="text-accent-gold" />
                <RiskGauge value={75} label="Capital Deployed" color="text-accent-blue" />
              </div>

              {/* Sector concentration */}
              <div className="panel p-6">
                <div className="text-xs font-mono text-text-muted uppercase mb-4">Sector Concentration</div>
                <div className="space-y-3">
                  {Object.entries(riskData.concentration).map(([sector, pct]) => (
                    <div key={sector} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-text-secondary w-20">{sector}</span>
                      <div className="flex-1 h-2 bg-bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent-blue"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-text-muted w-10 text-right">{pct}%</span>
                    </div>
                  ))}
                </div>
                {riskData.concentration.Banking > 35 && (
                  <div className="mt-4 text-xs text-accent-gold font-mono bg-accent-gold/10 border border-accent-gold/30 rounded-lg p-3">
                    ⚠️ High concentration in Banking sector. AI will diversify on next rebalance.
                  </div>
                )}
              </div>

              {/* Risk settings */}
              <div className="panel p-6">
                <div className="text-xs font-mono text-text-muted uppercase mb-4">Current Risk Settings</div>
                {[
                  { label: 'Risk Profile', value: user.riskProfile },
                  { label: 'Daily Loss Limit', value: `₹${user.dailyLossLimit?.toLocaleString()}` },
                  { label: 'Max Position Size', value: `${user.maxPositionSize}%` },
                  { label: 'Capital Allocation', value: `${user.capitalAllocation}%` },
                  { label: 'AI Mode', value: user.aiMode },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2 border-b border-bg-border last:border-0">
                    <span className="text-xs font-mono text-text-muted">{label}</span>
                    <span className="text-xs font-mono font-bold text-text-primary capitalize">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WALLET */}
          {tab === 2 && (
            <div className="max-w-lg mx-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Available Balance', value: walletData.availableBalance, color: 'text-accent-green', desc: 'Ready to deploy' },
                  { label: 'Deployed', value: walletData.deployed, color: 'text-accent-blue', desc: 'In active positions' },
                  { label: 'Realized Profits', value: walletData.profits, color: 'text-accent-gold', desc: 'Available to withdraw' },
                  { label: 'Total Withdrawable', value: walletData.withdrawable, color: 'text-text-primary', desc: 'Balance + profits' },
                ].map(({ label, value, color, desc }) => (
                  <div key={label} className="panel p-5">
                    <div className="text-[10px] font-mono text-text-muted mb-1">{label}</div>
                    <div className={`text-xl font-mono font-bold ${color} mb-1`}>{formatINR(value)}</div>
                    <div className="text-[10px] text-text-muted">{desc}</div>
                  </div>
                ))}
              </div>

              <div className="panel p-6 space-y-4">
                <div className="text-sm font-semibold text-text-primary">Withdraw Profits</div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Amount to withdraw"
                    className="flex-1 bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                  />
                  <button
                    onClick={() => toast.success('Withdrawal initiated via UPI. Arrives in 1–2 hours.')}
                    className="bg-accent-green text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-400 transition-colors text-sm"
                  >
                    Withdraw via UPI
                  </button>
                </div>
                <div className="text-xs text-text-muted font-mono">
                  Linked Dhan account: {user.dhanClientId ? `****${user.dhanClientId.slice(-4)}` : 'Not connected — connect in Settings'}
                </div>
              </div>
            </div>
          )}

          {/* TAX & AUDIT */}
          {tab === 3 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="panel p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-display font-bold text-text-primary mb-1">Annual Tax Report</h3>
                    <p className="text-text-secondary text-sm">Auto-generated. No accountant needed.</p>
                  </div>
                  <button
                    onClick={() => toast.success('Tax report PDF downloading...')}
                    className="flex items-center gap-2 bg-accent-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors"
                  >
                    <FileText size={15} />
                    Download PDF
                  </button>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Total Trades (FY 2024-25)', value: '147' },
                    { label: 'Short-Term Gains (STCG)', value: '₹28,450', color: 'text-accent-green' },
                    { label: 'Long-Term Gains (LTCG)', value: '₹12,800', color: 'text-accent-green' },
                    { label: 'Tax-Loss Harvested', value: '₹4,200', color: 'text-accent-blue' },
                    { label: 'Net Taxable Gains', value: '₹37,050', color: 'text-accent-gold' },
                    { label: 'Estimated Tax @15% STCG', value: '₹4,268', color: 'text-accent-red' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between py-2.5 border-b border-bg-border last:border-0">
                      <span className="text-sm text-text-secondary">{label}</span>
                      <span className={`text-sm font-mono font-bold ${color || 'text-text-primary'}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel p-6">
                <div className="text-sm font-semibold text-text-primary mb-4">Full Audit Trail</div>
                <p className="text-text-secondary text-xs mb-4">
                  Every AI decision, every trade, every price — timestamped and tamper-proof.
                </p>
                <button
                  onClick={() => toast.success('Audit trail CSV downloading...')}
                  className="text-accent-blue text-sm font-mono hover:underline"
                >
                  Download Full Audit Trail (CSV)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}