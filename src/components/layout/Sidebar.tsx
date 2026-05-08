'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import {
  LayoutDashboard, TrendingUp, Zap, FlaskConical,
  Newspaper, Shield, Settings, Bell, LogOut, Bot,
  ChevronRight
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: TrendingUp, label: 'Markets', path: '/markets' },
  { icon: Zap, label: 'Trade', path: '/trade' },
  { icon: FlaskConical, label: 'Paper Trading', path: '/paper-trading' },
  { icon: Newspaper, label: 'News', path: '/news' },
  { icon: Shield, label: 'Safety', path: '/safety' },
]

const bottomItems = [
  { icon: Bell, label: 'Alerts', path: '/profile?tab=notifications' },
  { icon: Settings, label: 'Settings', path: '/profile' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, aiStatus, unreadNotifications, isPaperMode } = useAppStore()

  return (
    <aside className="w-[64px] md:w-[200px] h-full bg-bg-secondary border-r border-bg-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-bg-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue to-accent-green flex items-center justify-center">
            <Bot size={14} className="text-white" />
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-bold font-display text-text-primary tracking-wider">AIVOLT</div>
            <div className="text-[9px] text-text-muted font-mono">AI TRADING</div>
          </div>
        </div>
      </div>

      {/* AI Status */}
      <div className="hidden md:flex items-center gap-2 px-4 py-3 border-b border-bg-border">
        <div className="relative">
          <div className={`w-2 h-2 rounded-full ${aiStatus === 'Active' ? 'bg-accent-green' : 'bg-yellow-400'}`} />
          {aiStatus === 'Active' && (
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-accent-green animate-ping opacity-50" />
          )}
        </div>
        <span className="text-[10px] font-mono text-text-secondary">AI {aiStatus}</span>
        {isPaperMode && (
          <span className="ml-auto text-[9px] bg-accent-gold/10 text-accent-gold px-1.5 py-0.5 rounded font-mono">
            PAPER
          </span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = pathname === path || pathname.startsWith(path + '/')
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 group relative',
                isActive
                  ? 'text-accent-blue bg-accent-blue/10 border-r-2 border-accent-blue'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              )}
            >
              <Icon size={16} className={isActive ? 'text-accent-blue' : 'text-current'} />
              <span className="hidden md:block font-medium">{label}</span>
              {isActive && (
                <ChevronRight size={12} className="ml-auto hidden md:block text-accent-blue" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom items */}
      <div className="border-t border-bg-border py-2">
        {bottomItems.map(({ icon: Icon, label, path }) => (
          <button
            key={path}
            onClick={() => router.push(path)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-all relative"
          >
            <Icon size={16} />
            <span className="hidden md:block">{label}</span>
            {label === 'Alerts' && unreadNotifications > 0 && (
              <span className="absolute left-7 top-1.5 w-4 h-4 bg-accent-red rounded-full text-[9px] flex items-center justify-center text-white font-bold md:relative md:left-auto md:top-auto md:ml-auto">
                {unreadNotifications}
              </span>
            )}
          </button>
        ))}

        {/* User profile */}
        {user && (
          <div className="px-4 py-3 border-t border-bg-border mt-1">
            <div className="hidden md:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-blue to-accent-green flex items-center justify-center text-xs font-bold text-white">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary truncate">{user.name}</div>
                <div className="text-[10px] text-text-muted font-mono capitalize">{user.aiMode} mode</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
