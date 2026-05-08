import { NextRequest, NextResponse } from 'next/server'

const NEWS_API_KEY = process.env.NEWS_API_KEY
const NEWS_API_BASE = 'https://newsapi.org/v2'

// Financial RSS feeds as backup (no key needed)
const RSS_SOURCES = [
  'https://economictimes.indiatimes.com/markets/stocks/rss.cms',
  'https://www.moneycontrol.com/rss/marketsindia.xml',
]

export interface NewsItem {
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  impactedStocks: string[]
}

function analyzeSentiment(text: string): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  const bullishWords = ['surge', 'rally', 'gain', 'rise', 'up', 'positive', 'growth', 'record', 'profit', 'beat', 'strong', 'bullish', 'buy', 'upgrade']
  const bearishWords = ['fall', 'drop', 'decline', 'loss', 'down', 'negative', 'crash', 'sell', 'bearish', 'downgrade', 'miss', 'weak', 'concern']

  const lower = text.toLowerCase()
  let bullScore = 0
  let bearScore = 0

  bullishWords.forEach(w => { if (lower.includes(w)) bullScore++ })
  bearishWords.forEach(w => { if (lower.includes(w)) bearScore++ })

  if (bullScore > bearScore) return 'BULLISH'
  if (bearScore > bullScore) return 'BEARISH'
  return 'NEUTRAL'
}

function extractStocks(text: string): string[] {
  const knownStocks = [
    'RELIANCE', 'TCS', 'HDFC', 'INFOSYS', 'WIPRO', 'ICICI', 'KOTAK',
    'BAJAJ', 'MARUTI', 'AIRTEL', 'ITC', 'ONGC', 'NTPC', 'TATA', 'ADANI',
    'ZOMATO', 'PAYTM', 'NYKAA', 'HINDALCO', 'JSWSTEEL', 'TATASTEEL'
  ]

  return knownStocks.filter(stock =>
    text.toUpperCase().includes(stock)
  ).slice(0, 3)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') || 'india'
  const page = parseInt(searchParams.get('page') || '1')

  try {
    if (!NEWS_API_KEY || NEWS_API_KEY === 'your_newsapi_key') {
      // Return mock news if no API key
      return NextResponse.json(getMockNews())
    }

    const queries: Record<string, string> = {
      india: 'Indian stock market NSE BSE NIFTY SENSEX',
      us: 'US stock market Wall Street S&P 500 NASDAQ',
      crypto: 'cryptocurrency Bitcoin Ethereum crypto market India',
      commodities: 'crude oil gold silver commodity market India',
    }

    const query = queries[category] || queries.india

    const res = await fetch(
      `${NEWS_API_BASE}/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=20&page=${page}&apiKey=${NEWS_API_KEY}`,
      { next: { revalidate: 300 } }
    )

    if (!res.ok) throw new Error('NewsAPI failed')

    const data = await res.json()
    const articles = data.articles || []

    const news: NewsItem[] = articles.map((a: any) => ({
      title: a.title || '',
      description: a.description || '',
      url: a.url || '',
      source: a.source?.name || 'Unknown',
      publishedAt: a.publishedAt || new Date().toISOString(),
      sentiment: analyzeSentiment(`${a.title} ${a.description}`),
      impactedStocks: extractStocks(`${a.title} ${a.description}`),
    }))

    return NextResponse.json(news)
  } catch {
    return NextResponse.json(getMockNews())
  }
}

function getMockNews(): NewsItem[] {
  const now = new Date()
  return [
    {
      title: 'NIFTY 50 hits fresh high as FII buying resumes',
      description: 'Foreign institutional investors turned net buyers as global risk appetite improved following positive US CPI data.',
      url: 'https://economictimes.indiatimes.com',
      source: 'Economic Times',
      publishedAt: new Date(now.getTime() - 1800000).toISOString(),
      sentiment: 'BULLISH',
      impactedStocks: ['HDFC', 'ICICI', 'RELIANCE'],
    },
    {
      title: 'RBI keeps repo rate unchanged at 6.5%',
      description: 'The Reserve Bank of India maintained its repo rate, signaling continued focus on inflation management while supporting growth.',
      url: 'https://moneycontrol.com',
      source: 'Moneycontrol',
      publishedAt: new Date(now.getTime() - 3600000).toISOString(),
      sentiment: 'NEUTRAL',
      impactedStocks: ['HDFC', 'KOTAK', 'ICICI'],
    },
    {
      title: 'Reliance Industries Q3 profit beats estimates by 12%',
      description: 'Reliance Industries reported quarterly profit that beat analyst estimates, driven by strong performance in retail and digital services.',
      url: 'https://economictimes.indiatimes.com',
      source: 'Economic Times',
      publishedAt: new Date(now.getTime() - 7200000).toISOString(),
      sentiment: 'BULLISH',
      impactedStocks: ['RELIANCE'],
    },
    {
      title: 'IT sector under pressure as US slowdown fears mount',
      description: 'IT stocks declined as concerns about reduced technology spending in the US market weighed on sentiment.',
      url: 'https://moneycontrol.com',
      source: 'Moneycontrol',
      publishedAt: new Date(now.getTime() - 10800000).toISOString(),
      sentiment: 'BEARISH',
      impactedStocks: ['TCS', 'INFOSYS', 'WIPRO'],
    },
    {
      title: 'Adani Group stocks surge after audit report release',
      description: 'Adani Group companies rallied sharply after the release of audit committee findings showed no financial irregularities.',
      url: 'https://economictimes.indiatimes.com',
      source: 'Economic Times',
      publishedAt: new Date(now.getTime() - 14400000).toISOString(),
      sentiment: 'BULLISH',
      impactedStocks: ['ADANI'],
    },
  ]
}
