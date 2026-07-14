# Aivolt — AI-Powered Autonomous Stock Trading Platform

Aivolt is a full-stack stock trading platform where an AI brain autonomously trades Indian stocks on your behalf using your Dhan brokerage account. You set your risk level once — the AI analyzes markets, executes trades, manages risk, and protects your capital 24/7 without you lifting a finger.

---

##  Features

-  **Full AI Autopilot** — AI trades intraday, swing, options & futures without user input
-  **Paper Trading** — Test the AI with ₹10 lakh virtual money before going live
-  **AI Risk Shield** — Auto-pauses trading if drawdown exceeds your set limit
-  **Panic Button** — One tap stops all AI trading instantly
-  **P&L Tracker** — Day / week / month view with full trade journal
-  **Top 50 AI Picks** — Leaderboard of best opportunities, updated every hour
-  **Morning Brief** — AI-generated market briefing every trading day at 8:45 AM
-  **AI Debate Room** — Bull AI vs Bear AI argue before every major trade
-  **Live News** — Indian + global news with AI sentiment tags (Bullish/Bearish/Neutral)
-  **Crash Simulator** — See how your portfolio survives 2008, COVID 2020, 2022 crashes
-  **Stock Screener** — Filter by sector, momentum score, AI signal
-  **Market Pulse** — Real-time market mood, institutional activity, global risk level

---

##  Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, TailwindCSS, TradingView Lightweight Charts |
| Backend | Python 3.11, FastAPI |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| AI Brain | Groq API — Llama3-70B (free tier) |
| Broker | Dhan API (India) |
| Market Data | NSE India public API (free) |
| News | GNews API (free tier) |
| Hosting | Vercel (frontend) + Railway (backend) |

---

##  Project Structure

```
aivolt/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── config.py                # Environment variables
│   ├── schema.sql               # Full database schema — run once in Supabase
│   ├── requirements.txt
│   ├── routers/
│   │   ├── auth.py              # Signup, login, Dhan connect
│   │   ├── portfolio.py         # Holdings, positions, funds
│   │   ├── trades.py            # Manual + AI orders, panic exit
│   │   ├── market.py            # Live quotes, indices, screener
│   │   ├── news.py              # Indian, global, crypto news
│   │   ├── ai_brain.py          # Morning brief, top 50, debate, audit
│   │   ├── paper_trading.py     # Virtual trading simulation
│   │   └── analytics.py         # P&L charts and trade journal
│   └── services/
│       ├── dhan_service.py      # All Dhan API calls
│       ├── groq_service.py      # All AI logic
│       └── scheduler.py         # Autopilot loop + daily cron jobs
└── frontend/
    ├── app/
    │   ├── page.tsx             # Landing page
    │   ├── dashboard/           # Main cockpit
    │   ├── markets/             # Top 50 + screener + watchlist
    │   ├── trade/               # AI trade room + autopilot
    │   ├── paper/               # Paper trading
    │   ├── news/                # News + morning brief
    │   ├── analytics/           # P&L tracker
    │   ├── safety/              # Panic button + risk monitor
    │   └── settings/            # AI config + broker + notifications
    ├── components/              # All reusable UI components
    └── lib/                     # API calls, Supabase client, helpers
```

##  Roadmap

- [ ] Dhan WebSocket for true real-time prices
- [ ] US markets via Alpaca API
- [ ] Mobile app in React Native
- [ ] WhatsApp trade alerts
- [ ] Backtesting engine on historical data
- [ ] Options chain viewer with Greeks

---

*Built with — AI that never sleeps, markets that never stop.*
