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
const ADMIN_CODE = '9999'

export default function LoginPage() {
  const { login, tech, isLoading } = useAuth()
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [techs, setTechs] = useState<Tech[]>([])
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [shake, setShake] = useState(false)
  const [tabletCentre, setTabletCentre] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!isLoading && tech) router.replace('/caisse')
  }, [tech, isLoading, router])

  useEffect(() => {
    const saved = localStorage.getItem('dw_tablet_centre')
    setTabletCentre(saved) // null = pas configuré, string = configuré
  }, [])

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

  const selectCentre = (c: string) => {
    localStorage.setItem('dw_tablet_centre', c)
    setTabletCentre(c)
  }

  const handleKey = useCallback((k: string) => {
    if (k === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return }
    if (pin.length >= 4) return
    const next = pin + k
    setPin(next)
    setError('')
    if (next.length === 4) {
      if (next === ADMIN_CODE) {
        router.push('/admin')
        return
      }
      setChecking(true)
      setTimeout(() => {
        const found = techs.find(t => t.code === next)
        if (!found) {
          setShake(true)
          setError('Code non reconnu')
          setPin('')
          setTimeout(() => setShake(false), 400)
        } else {
          login(found, tabletCentre || 'Belleville')
          router.replace('/caisse')
        }
        setChecking(false)
      }, 300)
    }
  }, [pin, techs, tabletCentre, login, router])

  // Chargement initial
  if (tabletCentre === undefined) return null

  // ── Écran de configuration (premier lancement) ──────────────────
  if (!tabletCentre) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
        <div className="flex flex-col items-center mb-10 animate-fadeUp">
          <DreamwashLogo size="lg" />
          <p className="text-white/60 text-sm mt-2">Caisse enregistreuse</p>
        </div>

        <div className="w-full max-w-sm animate-fadeUp">
          <div className="glass rounded-2xl p-6">
            <p className="text-white font-black text-lg text-center mb-1">Configuration initiale</p>
            <p className="text-white/50 text-sm text-center mb-6">
              Choisissez le centre de cette tablette
            </p>
            <div className="flex flex-col gap-2">
              {CENTRES.map(c => (
                <button key={c} onClick={() => selectCentre(c)}
                  className="w-full py-4 rounded-xl text-white font-bold text-base transition-all active:scale-95 hover:bg-white/20"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  📍 {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Écran PIN (normal) ──────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="flex flex-col items-center mb-8 animate-fadeUp">
        <DreamwashLogo size="lg" />
        <p className="text-white/60 text-sm mt-2">Caisse enregistreuse</p>
      </div>

      {/* Centre badge */}
      <div className="mb-6 animate-fadeUp">
        <div className="glass px-5 py-2 rounded-full flex items-center gap-2">
          <span className="text-white/50 text-xs">📍</span>
          <span className="text-white font-bold text-sm">{tabletCentre}</span>
        </div>
      </div>

      {/* PIN card */}
      <div className={`w-full max-w-xs glass rounded-2xl p-6 animate-fadeUp ${shake ? 'animate-shake' : ''}`}>
        <p className="text-center text-white/70 text-sm font-semibold mb-4">Code PIN</p>

        <div className="flex justify-center gap-4 mb-6">
          {[0,1,2,3].map(i => (
            <div key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < pin.length ? 'bg-white border-white scale-110' : 'border-white/40'
              }`} />
          ))}
        </div>

        {error && (
          <p className="text-center text-red-300 text-sm mb-3 font-semibold">{error}</p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k, i) => {
            if (!k) return <div key={i} />
            return (
              <button key={i} onClick={() => handleKey(k)}
                disabled={checking}
                className={`py-4 rounded-xl text-xl font-bold transition-all active:scale-95 ${
                  k === '⌫' ? 'text-white/60 hover:bg-white/10' : 'text-white hover:bg-white/20 active:bg-white/30'
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
