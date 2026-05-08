import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AIVOLT — AI-Powered Trading',
  description: 'Your money. Our AI. Zero effort.',
  keywords: 'AI trading, stock market, India, NIFTY, algorithmic trading',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} bg-bg-primary text-text-primary antialiased`}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#131929',
              color: '#e8eaf6',
              border: '1px solid #1e2d4a',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
            },
          }}
        />
        {children}
      </body>
    </html>
  )
}
