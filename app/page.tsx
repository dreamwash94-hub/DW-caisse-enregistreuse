'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { CENTRES } from '@/lib/data'
import { Tech } from '@/types'
import DreamwashLogo from '@/components/DreamwashLogo'

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export default function LoginPage() {
  const { login, tech, isLoading } = useAuth()
  const router = useRouter()
  const [centre, setCentre] = useState(CENTRES[0])
  const [pin, setPin] = useState('')
  const [techs, setTechs] = useState<Tech[]>([])
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (!isLoading && tech) router.replace('/caisse')
  }, [tech, isLoading, router])

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'portail', 'techs'))
        if (snap.exists()) {
          const list: Tech[] = JSON.parse(snap.data().data)
          setTechs(list.filter(t => !t.statut || t.statut === 'actif'))
        }
      } catch {}
    }
    load()
  }, [])

  const handleKey = useCallback((k: string) => {
    if (k === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return }
    if (pin.length >= 4) return
    const next = pin + k
    setPin(next)
    setError('')
    if (next.length === 4) {
      setChecking(true)
      setTimeout(() => {
        const found = techs.find(t => t.code === next)
        if (!found) {
          setShake(true)
          setError('Code non reconnu')
          setPin('')
          setTimeout(() => setShake(false), 400)
        } else {
          login(found, centre)
          router.replace('/caisse')
        }
        setChecking(false)
      }, 300)
    }
  }, [pin, techs, centre, login, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8 animate-fadeUp">
        <DreamwashLogo size="lg" />
        <p className="text-white/60 text-sm mt-2">Caisse enregistreuse</p>
      </div>

      {/* Centre selection */}
      <div className="w-full max-w-sm mb-6 animate-fadeUp">
        <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2 text-center">
          Sélectionnez votre centre
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {CENTRES.map(c => (
            <button key={c} onClick={() => { setCentre(c); setPin(''); setError('') }}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                centre === c
                  ? 'bg-dw-pink text-white shadow-lg'
                  : 'text-white border border-white/30 hover:bg-white/20'
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* PIN card */}
      <div className={`w-full max-w-xs glass rounded-2xl p-6 animate-fadeUp ${shake ? 'animate-shake' : ''}`}>
        <p className="text-center text-white/70 text-sm font-semibold mb-4">Code PIN</p>

        {/* Dots */}
        <div className="flex justify-center gap-4 mb-6">
          {[0,1,2,3].map(i => (
            <div key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < pin.length
                  ? 'bg-white border-white scale-110'
                  : 'border-white/40'
              }`} />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-center text-red-300 text-sm mb-3 font-semibold">{error}</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k, i) => {
            if (!k) return <div key={i} />
            return (
              <button key={i} onClick={() => handleKey(k)}
                disabled={checking}
                className={`py-4 rounded-xl text-xl font-bold transition-all active:scale-95 ${
                  k === '⌫'
                    ? 'text-white/60 hover:bg-white/10'
                    : 'text-white hover:bg-white/20 active:bg-white/30'
                }`}
                style={{ background: k === '⌫' ? 'transparent' : 'rgba(255,255,255,0.1)' }}>
                {checking && pin.length === 4 && k !== '⌫' ? '' : k}
              </button>
            )
          })}
        </div>

        {checking && (
          <div className="flex justify-center mt-4">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
