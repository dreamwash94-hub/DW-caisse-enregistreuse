'use client'
import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Vente, Facture } from '@/types'
import { fmt, CENTRES, COMPANY } from '@/lib/data'
import { useRouter } from 'next/navigation'
import DreamwashLogo from '@/components/DreamwashLogo'

const ADMIN_CODE = '9999'
const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

const todayStr = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

const buildInvoiceHTML = (facture: Facture) => {
  const { vente, client } = facture
  const rows = vente.items.map(it =>
    `<tr>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e7eb">${it.nom}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">${it.description||''}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(it.prix)}</td>
    </tr>`
  ).join('')
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${facture.numero}</title>
  <style>body{font-family:Arial,sans-serif;color:#111;padding:32px;max-width:700px;margin:0 auto}
  .logo{color:#1565C0;font-size:22px;font-weight:900}.header{display:flex;justify-content:space-between;margin-bottom:32px}
  table{width:100%;border-collapse:collapse}th{padding:8px 4px;border-bottom:2px solid #1565C0;text-align:left;font-size:12px;color:#6b7280}
  .total-row td{border-top:2px solid #1565C0;font-weight:900;font-size:17px;color:#1565C0;padding-top:8px}
  .footer{margin-top:40px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px}
  </style></head><body>
  <div class="header">
    <div><div class="logo">Dreamwash</div>
    <div style="font-size:13px;color:#6b7280">${COMPANY.adresse}</div>
    <div style="font-size:13px;color:#6b7280">${COMPANY.telephone} · ${COMPANY.email}</div>
    <div style="font-size:12px;color:#9ca3af">SIRET: ${COMPANY.siret}</div></div>
    <div style="text-align:right;font-size:13px;color:#6b7280">
      <strong style="display:block;font-size:15px;color:#111">FACTURE</strong>
      ${facture.numero}<br>${facture.date}<br>Centre: ${vente.centre}</div>
  </div>
  ${client ? `<div style="margin-bottom:24px"><strong>${client.nom}${client.societe?` · ${client.societe}`:''}</strong><br>
  ${client.adresse||''}<br>${client.email||''}<br>${client.telephone||''}
  ${client.immatriculation?`<br>🚗 <strong>${client.immatriculation.toUpperCase()}</strong>`:''}</div>` : ''}
  <table><thead><tr><th>Prestation</th><th>Description</th><th style="text-align:right">Prix TTC</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div style="text-align:right;margin-top:16px">
    <div style="color:#6b7280;font-size:13px">Total HT : ${fmt(vente.totalHT)}</div>
    <div style="color:#6b7280;font-size:13px">TVA 20% : ${fmt(vente.tva)}</div>
    <table><tr class="total-row"><td style="padding-right:24px">Total TTC</td><td>${fmt(vente.totalTTC)}</td></tr></table>
  </div>
  <div class="footer">Merci de votre confiance · ${COMPANY.adresse} · ${COMPANY.telephone}</div>
  </body></html>`
}

const printFacture = (facture: Facture) => {
  const win = window.open('', '_blank')!
  win.document.write(buildInvoiceHTML(facture))
  win.document.close()
  setTimeout(() => win.print(), 400)
}

export default function AdminPage() {
  const router = useRouter()
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [ventes, setVentes] = useState<Vente[]>([])
  const [filterCentre, setFilterCentre] = useState('Tous')
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [filterPaiement, setFilterPaiement] = useState<'tous'|'especes'|'carte'>('tous')
  const [tabletCentre, setTabletCentre] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState(false)
  const [factures, setFactures] = useState<Facture[]>([])
  const [activeTab, setActiveTab] = useState<'ventes'|'factures'>('ventes')

  useEffect(() => {
    setTabletCentre(localStorage.getItem('dw_tablet_centre'))
  }, [])

  useEffect(() => {
    if (!unlocked) return
    const qv = query(collection(db, 'ventes'), orderBy('timestamp', 'desc'))
    const unsubV = onSnapshot(qv, snap => {
      setVentes(snap.docs.map(d => ({ ...d.data() as Vente, id: d.id })))
    })
    const qf = query(collection(db, 'factures'), orderBy('dateISO', 'desc'))
    const unsubF = onSnapshot(qf, snap => {
      setFactures(snap.docs.map(d => ({ ...d.data() as Facture, id: d.id })))
    })
    return () => { unsubV(); unsubF() }
  }, [unlocked])

  const handleKey = (k: string) => {
    if (k === '⌫') { setPin(p => p.slice(0,-1)); return }
    if (pin.length >= 4) return
    const next = pin + k
    setPin(next)
    if (next.length === 4) {
      if (next === ADMIN_CODE) {
        setUnlocked(true)
      } else {
        setShake(true)
        setTimeout(() => { setShake(false); setPin('') }, 400)
      }
    }
  }

  const saveTabletCentre = (c: string) => {
    localStorage.setItem('dw_tablet_centre', c)
    setTabletCentre(c)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

  const getMonthKey = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  }

  const monthLabel = (key: string) => {
    const [y, m] = key.split('-')
    return MOIS_FR[parseInt(m)-1] + ' ' + y
  }

  const availableMonths = [...new Set(ventes.map(v => getMonthKey(v.dateISO)))].sort().reverse()

  const filterVente = (v: Vente) => {
    const monthOk = filterMonth === 'all' || getMonthKey(v.dateISO) === filterMonth
    const centreOk = filterCentre === 'Tous' || v.centre === filterCentre
    const paiementOk = filterPaiement === 'tous' || v.paiement === filterPaiement
    return monthOk && centreOk && paiementOk
  }

  const filterFacture = (f: Facture) => {
    const monthOk = filterMonth === 'all' || getMonthKey(f.dateISO) === filterMonth
    const centreOk = filterCentre === 'Tous' || f.vente?.centre === filterCentre
    return monthOk && centreOk
  }

  const visible = ventes.filter(filterVente)
  const totalCA = visible.reduce((s, v) => s + v.totalTTC, 0)
  const byCenter = CENTRES.map(c => ({
    centre: c,
    ventes: visible.filter(v => v.centre === c),
    ca: visible.filter(v => v.centre === c).reduce((s,v) => s + v.totalTTC, 0),
  })).filter(x => x.ventes.length > 0)

  if (!unlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <button onClick={() => router.replace('/')}
          className="absolute top-4 left-4 text-white/50 hover:text-white text-sm transition-all">
          ← Retour
        </button>
        <div className="mb-6">
          <DreamwashLogo size="sm" />
        </div>
        <p className="text-white/70 text-sm font-semibold mb-6">Mode administrateur</p>
        <div className={`glass rounded-2xl p-6 w-full max-w-xs ${shake ? 'animate-shake' : ''}`}>
          <div className="flex justify-center gap-4 mb-6">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
                i < pin.length ? 'bg-white border-white' : 'border-white/40'
              }`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((k, i) => {
              if (!k) return <div key={i} />
              return (
                <button key={i} onClick={() => handleKey(k)}
                  className={`py-4 rounded-xl text-xl font-bold transition-all active:scale-95 ${
                    k === '⌫' ? 'text-white/60' : 'text-white hover:bg-white/20'
                  }`}
                  style={{ background: k === '⌫' ? 'transparent' : 'rgba(255,255,255,0.1)' }}>
                  {k}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header standalone */}
      <header className="glass flex items-center justify-between px-4 py-3 flex-shrink-0 safe-top">
        <div className="flex items-center gap-3">
          <DreamwashLogo size="sm" />
          <span className="text-white/60 text-xs font-semibold">Admin</span>
        </div>
        <button onClick={() => router.replace('/')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/80 hover:bg-white/20 transition-all border border-white/20">
          ← Retour
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Tablet config */}
        <div className="glass rounded-2xl p-4">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
            ⚙️ Configuration de cette tablette
          </p>
          <p className="text-white/50 text-xs mb-3">
            Centre actuel : <span className="text-white font-bold">{tabletCentre || 'Non configuré'}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {CENTRES.map(c => (
              <button key={c} onClick={() => saveTabletCentre(c)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  tabletCentre === c
                    ? 'bg-dw-pink text-white shadow-lg'
                    : 'text-white/80 border border-white/30 hover:bg-white/20'
                }`}>
                {c}
              </button>
            ))}
          </div>
          {savedMsg && (
            <p className="text-dw-pale text-xs font-semibold mt-2">✓ Centre sauvegardé !</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-shrink-0">
          {(['ventes','factures'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all capitalize ${
                activeTab === t ? 'bg-white text-dw-dark' : 'text-white/70 border border-white/20 hover:bg-white/10'
              }`}>
              {t === 'ventes' ? '🧾 Ventes' : '📄 Factures'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {/* Mois */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setFilterMonth('all')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-semibold flex-shrink-0 transition-all ${
                filterMonth === 'all' ? 'bg-white text-dw-dark' : 'text-white/80 hover:bg-white/20 border border-white/20'
              }`}>Tout</button>
            {availableMonths.map(m => (
              <button key={m} onClick={() => setFilterMonth(m)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-semibold flex-shrink-0 transition-all ${
                  filterMonth === m ? 'bg-white text-dw-dark' : 'text-white/80 hover:bg-white/20 border border-white/20'
                }`}>{monthLabel(m)}</button>
            ))}
          </div>
          {/* Centre + Paiement */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setFilterCentre('Tous')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  filterCentre === 'Tous' ? 'bg-white text-dw-dark' : 'text-white/80 hover:bg-white/20 border border-white/20'
                }`}>Tous</button>
              {CENTRES.map(c => (
                <button key={c} onClick={() => setFilterCentre(c)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    filterCentre === c ? 'bg-white text-dw-dark' : 'text-white/80 hover:bg-white/20 border border-white/20'
                  }`}>{c}</button>
              ))}
            </div>
            {activeTab === 'ventes' && (
              <div className="flex gap-1">
                {([['tous','Tous'],['especes','💵 Espèces'],['carte','💳 Carte']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setFilterPaiement(val)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      filterPaiement === val ? 'bg-white text-dw-dark' : 'text-white/80 hover:bg-white/20 border border-white/20'
                    }`}>{label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {activeTab === 'factures' ? (
          /* ── FACTURES ── */
          <div className="flex flex-col gap-3">
            {factures.filter(filterFacture).slice(0, 50).map((f, i) => (
              <div key={f.id ?? i} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-white text-sm">{f.numero}</p>
                    {f.sent && <span className="text-xs text-white/40">✉ Envoyé</span>}
                  </div>
                  <p className="text-white/50 text-xs">{f.date} · {f.vente?.centre}</p>
                  {f.client && <p className="text-white/40 text-xs">👤 {f.client.nom}{f.client.immatriculation ? ` · 🚗 ${f.client.immatriculation.toUpperCase()}` : ''}</p>}
                  <p className="text-white/40 text-xs truncate">{f.vente?.items?.map(it=>it.nom).join(', ')}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-dw-pale font-black">{fmt(f.vente?.totalTTC ?? 0)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      f.vente?.paiement === 'carte' ? 'bg-blue-500/30 text-blue-200' : 'bg-dw-blue/30 text-dw-blue'
                    }`}>{f.vente?.paiement === 'carte' ? '💳' : '💵'}</span>
                  </div>
                  <button
                    onClick={() => printFacture(f)}
                    className="text-white/60 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all text-lg leading-none">
                    🖨️
                  </button>
                  {f.id && (
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer la facture ${f.numero} ?`))
                          deleteDoc(doc(db, 'factures', f.id!))
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg p-1.5 transition-all text-lg leading-none">
                      🗑
                    </button>
                  )}
                </div>
              </div>
            ))}
            {factures.length === 0 && (
              <div className="text-center text-white/30 py-8">Aucune facture</div>
            )}
          </div>
        ) : (
        <>
        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="glass rounded-xl p-4">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">CA Total</p>
            <p className="text-dw-pale font-black text-2xl">{fmt(totalCA)}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Ventes</p>
            <p className="text-white font-black text-2xl">{visible.length}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Panier moyen</p>
            <p className="text-white font-black text-2xl">
              {visible.length > 0 ? fmt(totalCA / visible.length) : '—'}
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Espèces</p>
            <p className="text-white font-black text-xl">
              {fmt(visible.filter(v=>v.paiement==='especes').reduce((s,v)=>s+v.totalTTC,0))}
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Carte</p>
            <p className="text-white font-black text-xl">
              {fmt(visible.filter(v=>v.paiement==='carte').reduce((s,v)=>s+v.totalTTC,0))}
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">TVA collectée</p>
            <p className="text-white font-black text-xl">
              {fmt(visible.reduce((s,v)=>s+v.tva,0))}
            </p>
          </div>
        </div>

        {/* By center */}
        {byCenter.length > 0 && (
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Par centre</p>
            <div className="space-y-2">
              {byCenter.sort((a,b) => b.ca - a.ca).map(({ centre, ventes: cv, ca }) => (
                <div key={centre} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-sm">{centre}</p>
                    <p className="text-white/50 text-xs">{cv.length} vente(s)</p>
                  </div>
                  <p className="text-dw-pale font-black text-lg">{fmt(ca)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent sales */}
        <div>
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Dernières ventes</p>
          {visible.length === 0 ? (
            <div className="text-center text-white/30 py-8">Aucune vente pour cette période</div>
          ) : (
            <div className="space-y-2 pb-8">
              {visible.slice(0, 50).map((v, i) => (
                <div key={v.id ?? i} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white text-sm">{v.tech.nom}</p>
                      <span className="text-white/40 text-xs">·</span>
                      <p className="text-white/60 text-xs">{v.centre}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        v.paiement === 'carte' ? 'bg-blue-500/30 text-blue-200' : 'bg-dw-blue/30 text-dw-blue'
                      }`}>
                        {v.paiement === 'carte' ? '💳' : '💵'}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs truncate">{v.items.map(it=>it.nom).join(', ')}</p>
                    {v.client && <p className="text-white/40 text-xs">👤 {v.client.nom}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-dw-pale font-black">{fmt(v.totalTTC)}</p>
                      <p className="text-white/40 text-xs">{v.date}</p>
                    </div>
                    {v.id && (
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer cette vente de ${fmt(v.totalTTC)} ?`))
                            deleteDoc(doc(db, 'ventes', v.id!))
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg p-1.5 transition-all text-lg leading-none">
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  )
}
