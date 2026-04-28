'use client'
import { useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import DreamwashLogo from '@/components/DreamwashLogo'

export default function AppShell({ children }: { children: ReactNode }) {
  const { tech, centre, logout, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [time, setTime] = useState('')

  useEffect(() => {
    if (!isLoading && !tech) router.replace('/')
  }, [tech, isLoading, router])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (isLoading || !tech) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const nav = [
    { href: '/caisse',   label: 'Caisse',   icon: '🧾' },
    { href: '/clients',  label: 'Clients',  icon: '👤' },
    { href: '/factures', label: 'Factures', icon: '📄' },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="glass flex items-center justify-between px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <DreamwashLogo size="sm" />
            <p className="text-xs text-white/60 leading-none mt-0.5">{centre}</p>
          </div>
        </div>

        <nav className="hidden sm:flex gap-1">
          {nav.map(n => (
            <Link key={n.href} href={n.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                pathname === n.href
                  ? 'bg-white text-dw-dark'
                  : 'text-white/80 hover:bg-white/20'
              }`}>
              {n.icon} {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="font-bold text-white text-sm leading-none">{time}</p>
            <p className="text-xs text-white/60 leading-none mt-0.5">{tech.nom}</p>
          </div>
          <button onClick={() => { logout(); router.replace('/') }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/80 hover:bg-white/20 transition-all border border-white/20">
            Déco
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="sm:hidden flex glass border-t border-white/10 safe-bottom">
        {nav.map(n => (
          <Link key={n.href} href={n.href}
            className={`flex-1 py-3 text-center text-xs font-semibold transition-all ${
              pathname === n.href ? 'text-dw-pink bg-white/15' : 'text-white/60'
            }`}>
            <div className="text-lg">{n.icon}</div>
            {n.label}
          </Link>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
