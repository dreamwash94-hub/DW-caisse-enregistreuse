'use client'
import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Facture } from '@/types'
import { fmt, COMPANY } from '@/lib/data'
import AppShell from '@/components/AppShell'

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
  ${client.adresse||''}<br>${client.email||''}<br>${client.telephone||''}</div>` : ''}
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

type Filter = 'today' | 'week' | 'month' | 'all'

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([])
  const [filter, setFilter] = useState<Filter>('today')
  const [selected, setSelected] = useState<Facture | null>(null)
  const [emailAddr, setEmailAddr] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [tabletCentre, setTabletCentre] = useState<string | null>(null)

  useEffect(() => {
    setTabletCentre(localStorage.getItem('dw_tablet_centre'))
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'factures'), orderBy('dateISO', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setFactures(snap.docs.map(d => ({ ...d.data() as Facture, id: d.id })))
    })
    return unsub
  }, [])

  const filterDate = (f: Facture) => {
    const d = new Date(f.dateISO)
    const now = new Date()
    const centreOk = !tabletCentre || f.vente?.centre === tabletCentre
    if (!centreOk) return false
    if (filter === 'today') return d.toDateString() === now.toDateString()
    if (filter === 'week') { const w = new Date(); w.setDate(w.getDate()-7); return d >= w }
    if (filter === 'month') { const m = new Date(); m.setMonth(m.getMonth()-1); return d >= m }
    return true
  }

  const visible = factures.filter(filterDate)

  const printFact = (f: Facture) => {
    const win = window.open('', '_blank')!
    win.document.write(buildInvoiceHTML(f))
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  const sendEmail = async (f: Facture) => {
    if (!emailAddr) return
    setSending(true)
    try {
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facture: f, to: emailAddr, html: buildInvoiceHTML(f) }),
      })
      if (res.ok) setEmailSent(true)
      else alert('Erreur envoi')
    } catch { alert('Erreur réseau') }
    setSending(false)
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week',  label: '7 derniers jours' },
    { key: 'month', label: '30 derniers jours' },
    { key: 'all',   label: 'Tout' },
  ]

  return (
    <AppShell>
      <div className="flex flex-col h-full p-4" style={{ height: 'calc(100vh - 100px)' }}>
        {/* Centre badge */}
        {tabletCentre && (
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <span className="text-white/50 text-xs">📍</span>
            <span className="text-white/80 text-xs font-semibold">{tabletCentre}</span>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto flex-shrink-0">
          {filters.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 ${
                filter === key ? 'bg-white text-dw-dark' : 'text-white/80 hover:bg-white/20 border border-white/20'
              }`}>
              {label}
            </button>
          ))}
          <span className="ml-auto text-white/50 text-sm self-center flex-shrink-0">{visible.length} facture(s)</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/30">
              <p className="text-4xl mb-2">📄</p>
              <p>Aucune facture pour cette période</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map(f => (
                <div key={f.id} className="glass rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-white text-sm">{f.numero}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        f.vente.paiement === 'carte' ? 'bg-blue-500/30 text-blue-200' : 'bg-dw-blue/30 text-dw-blue'
                      }`}>
                        {f.vente.paiement === 'carte' ? '💳 Carte' : '💵 Espèces'}
                      </span>
                      {f.sent && <span className="text-xs text-white/40">✉ Envoyé</span>}
                    </div>
                    <p className="text-white/60 text-xs">{f.date} · {f.vente.centre}</p>
                    {f.client && <p className="text-white/50 text-xs truncate">👤 {f.client.nom}{f.client.societe ? ` · ${f.client.societe}` : ''}</p>}
                    <p className="text-dw-pale font-black">{fmt(f.vente.totalTTC)}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => printFact(f)}
                      className="px-3 py-2 glass rounded-lg text-white/80 text-sm hover:bg-white/20 transition-all">
                      🖨️
                    </button>
                    <button onClick={() => { setSelected(f); setEmailAddr(f.client?.email ?? ''); setEmailSent(false) }}
                      className="px-3 py-2 glass rounded-lg text-white/80 text-sm hover:bg-white/20 transition-all">
                      ✉️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email modal */}
      {selected && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
             style={{ background: 'rgba(0,0,0,0.7)' }}
             onClick={e => { if(e.target === e.currentTarget) setSelected(null) }}>
          <div className="glass rounded-2xl p-5 w-full max-w-sm animate-popIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-white">Envoyer la facture</h2>
              <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white text-xl">×</button>
            </div>
            <p className="text-white/60 text-sm mb-3">{selected.numero} · {fmt(selected.vente.totalTTC)}</p>
            <input type="email" placeholder="email@client.fr" value={emailAddr}
              onChange={e => setEmailAddr(e.target.value)}
              className="w-full bg-white/20 rounded-xl px-4 py-3 text-white outline-none placeholder-white/40 mb-3"
            />
            {emailSent && <p className="text-dw-pale text-sm mb-2 font-semibold">✓ Email envoyé !</p>}
            <button onClick={() => sendEmail(selected)} disabled={sending || !emailAddr || emailSent}
              className="w-full py-3 rounded-xl bg-white text-dw-dark font-bold disabled:opacity-50 active:scale-95 transition-all">
              {sending ? 'Envoi...' : 'Envoyer par email'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
