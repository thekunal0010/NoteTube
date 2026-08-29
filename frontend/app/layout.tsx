import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Fraunces } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { SmoothScrollProvider } from '@/components/motion/smooth-scroll-provider'
import { ScrollProgress } from '@/components/motion/scroll-progress'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: 'NoteTube AI - Transform YouTube Lectures into Smart Study Materials',
  description: 'AI-powered educational platform that converts YouTube lectures into summarized notes, flashcards, MCQs, and revision materials.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#f4efe3',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`bg-[#f4efe3] ${fraunces.variable}`}>
      <body className="font-sans antialiased min-h-screen gradient-bg">
        <SmoothScrollProvider>
          <ScrollProgress />
          {children}
        </SmoothScrollProvider>
        <Toaster position="top-right" richColors theme="light" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
