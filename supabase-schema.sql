-- AIVOLT DATABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  dhan_client_id TEXT,
  dhan_access_token TEXT,
  risk_profile TEXT DEFAULT 'balanced' CHECK (risk_profile IN ('conservative', 'balanced', 'aggressive')),
  capital_allocation INTEGER DEFAULT 50,
  ai_mode TEXT DEFAULT 'quant' CHECK (ai_mode IN ('warren', 'quant', 'safe', 'hypergrowth')),
  autopilot_enabled BOOLEAN DEFAULT false,
  markets_enabled TEXT[] DEFAULT ARRAY['NSE', 'BSE'],
  daily_loss_limit DECIMAL DEFAULT 5000,
  max_position_size INTEGER DEFAULT 20,
  virtual_balance DECIMAL DEFAULT 1000000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades table
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'NSE',
  trade_type TEXT DEFAULT 'intraday' CHECK (trade_type IN ('intraday', 'swing', 'options', 'delivery')),
  order_type TEXT NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
  quantity INTEGER NOT NULL,
  price DECIMAL NOT NULL,
  target_price DECIMAL,
  stop_loss DECIMAL,
  ai_confidence INTEGER DEFAULT 70,
  ai_reasoning TEXT DEFAULT '',
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED', 'PENDING')),
  pnl DECIMAL,
  is_paper BOOLEAN DEFAULT false,
  dhan_order_id TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio holdings
CREATE TABLE IF NOT EXISTS public.portfolio (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'NSE',
  quantity INTEGER NOT NULL DEFAULT 0,
  avg_buy_price DECIMAL NOT NULL,
  current_price DECIMAL NOT NULL,
  pnl DECIMAL DEFAULT 0,
  pnl_percent DECIMAL DEFAULT 0,
  ai_confidence TEXT DEFAULT 'medium' CHECK (ai_confidence IN ('low', 'medium', 'high')),
  trade_type TEXT DEFAULT 'delivery',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- Daily PnL history
CREATE TABLE IF NOT EXISTS public.pnl_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  realized_pnl DECIMAL DEFAULT 0,
  unrealized_pnl DECIMAL DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  is_paper BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, is_paper)
);

-- Watchlist
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'NSE',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- AI Activity Feed
CREATE TABLE IF NOT EXISTS public.ai_activity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  symbol TEXT,
  reasoning TEXT DEFAULT '',
  confidence INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Morning Briefs
CREATE TABLE IF NOT EXISTS public.morning_briefs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  us_market_summary TEXT,
  key_events TEXT,
  ai_stance TEXT,
  top_stocks TEXT[],
  risk_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnl_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own data)
CREATE POLICY "Users can view own data" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own trades" ON public.trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own portfolio" ON public.portfolio FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own pnl" ON public.pnl_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own watchlist" ON public.watchlist FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own ai activity" ON public.ai_activity FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view morning briefs" ON public.morning_briefs FOR SELECT USING (true);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER portfolio_updated_at BEFORE UPDATE ON public.portfolio FOR EACH ROW EXECUTE FUNCTION update_updated_at();
