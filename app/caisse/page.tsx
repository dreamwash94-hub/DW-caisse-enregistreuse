'use client'
import { useState, useCallback } from 'react'
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { SERVICES, CATEGORIES, COMPANY, fmt } from '@/lib/data'
import { CartItem, Client, Vente, Facture } from '@/types'
import AppShell from '@/components/AppShell'

// ── Helpers ──────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2)

const genFactureNum = () => {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  return `DW-${ymd}-${Math.floor(1000+Math.random()*9000)}`
}

const todayFR = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

const buildInvoiceHTML = (facture: Facture) => {
  const { vente, client } = facture
  const rows = vente.items.map(it =>
    `<tr>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e7eb">${it.nom}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">${it.description || ''}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap">${fmt(it.prix)}</td>
    </tr>`
  ).join('')

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Facture ${facture.numero}</title>
  <style>
    body{font-family:Arial,sans-serif;color:#111;margin:0;padding:32px;max-width:700px;margin:0 auto}
    h1{font-size:28px;color:#1565C0;margin:0}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
    .logo{color:#1565C0;font-size:22px;font-weight:900;letter-spacing:-0.5px}
    .meta{text-align:right;font-size:13px;color:#6b7280}
    .meta strong{color:#111;display:block;font-size:15px}
    .section{margin-bottom:24px}
    .section-title{font-size:11px;text-transform:uppercase;color:#6b7280;font-weight:700;letter-spacing:1px;margin-bottom:8px}
    table{width:100%;border-collapse:collapse}
    th{padding:8px 4px;border-bottom:2px solid #1565C0;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280}
    th:last-child{text-align:right}
    .totals{margin-top:16px;text-align:right}
    .totals tr td{padding:4px 0}
    .totals tr td:first-child{color:#6b7280;font-size:13px;padding-right:24px}
    .totals tr.total td{font-size:17px;font-weight:900;color:#1565C0;border-top:2px solid #1565C0;padding-top:8px}
    .footer{margin-top:40px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px}
    .badge{display:inline-block;background:#dbeafe;color:#1565C0;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700}
  </style>
  </head><body>
  <div class="header">
    <div>
      <div class="logo">Dreamwash</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px">${COMPANY.adresse}</div>
      <div style="font-size:13px;color:#6b7280">${COMPANY.telephone} · ${COMPANY.email}</div>
      <div style="font-size:12px;color:#9ca3af;margin-top:2px">SIRET: ${COMPANY.siret}</div>
    </div>
    <div class="meta">
      <strong>FACTURE</strong>
      ${facture.numero}<br>
      ${facture.date}<br>
      Centre: ${vente.centre}<br>
      <span class="badge">${vente.paiement === 'especes' ? 'Espèces' : 'Carte bancaire'}</span>
    </div>
  </div>

  ${client ? `
  <div class="section">
    <div class="section-title">Facturer à</div>
    <strong>${client.nom}</strong>${client.societe ? ` · ${client.societe}` : ''}<br>
    ${client.adresse ? `${client.adresse}<br>` : ''}
    ${client.email ? `${client.email}<br>` : ''}
    ${client.telephone ? `${client.telephone}<br>` : ''}
    ${client.immatriculation ? `🚗 <strong>${client.immatriculation.toUpperCase()}</strong>` : ''}
  </div>` : ''}

  <div class="section">
    <table>
      <thead><tr>
        <th>Prestation</th><th>Description</th><th style="text-align:right">Prix TTC</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="totals">
      <tr><td>Total HT</td><td>${fmt(vente.totalHT)}</td></tr>
      <tr><td>TVA 20%</td><td>${fmt(vente.tva)}</td></tr>
      <tr class="total"><td>Total TTC</td><td>${fmt(vente.totalTTC)}</td></tr>
    </table>
  </div>

  ${vente.paiement === 'especes' && vente.montantRecu ? `
  <div style="font-size:13px;color:#6b7280">
    Montant reçu: ${fmt(vente.montantRecu)} · Monnaie rendue: ${fmt(vente.monnaie ?? 0)}
  </div>` : ''}

  <div class="footer">
    Merci de votre confiance · Dreamwash — ${COMPANY.adresse}<br>
    ${COMPANY.telephone} · ${COMPANY.email}
  </div>
  </body></html>`
}

// ── Component ─────────────────────────────────────────────
export default function CaissePage() {
  const { tech, centre } = useAuth()
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0])
  const [cart, setCart] = useState<CartItem[]>([])
  const [editingPrice, setEditingPrice] = useState<{id: string; val: string} | null>(null)
  const [client, setClient] = useState<Client | null>(null)

  // Payment modal
  const [showPay, setShowPay] = useState(false)
  const [payMethod, setPayMethod] = useState<'especes'|'carte'>('especes')
  const [montantRecu, setMontantRecu] = useState('')
  const [paying, setPaying] = useState(false)

  // Post-payment
  const [lastVente, setLastVente] = useState<Vente | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // Invoice modal
  const [showInvoice, setShowInvoice] = useState(false)
  const [lastFacture, setLastFacture] = useState<Facture | null>(null)
  const [emailAddr, setEmailAddr] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Client modal (panier)
  const [showClientModal, setShowClientModal] = useState(false)
  const [clientForm, setClientForm] = useState<Client>({ nom:'', societe:'', email:'', telephone:'', adresse:'', immatriculation:'' })
  const [clientSearch, setClientSearch] = useState('')

  // Client modal (facture)
  const [showClientForFacture, setShowClientForFacture] = useState(false)
  const [factureClientForm, setFactureClientForm] = useState<Client>({ nom:'', societe:'', email:'', telephone:'', adresse:'', immatriculation:'' })

  const total = cart.reduce((s, i) => s + i.prix, 0)
  const totalHT = total / 1.2
  const tva = total - totalHT

  // ── Cart actions ──
  const addToCart = useCallback((serviceId: string) => {
    const s = SERVICES.find(x => x.id === serviceId)!
    setCart(c => [...c, { cartId: uid(), service: s, prix: s.prix }])
  }, [])

  const removeFromCart = useCallback((cartId: string) => {
    setCart(c => c.filter(i => i.cartId !== cartId))
  }, [])

  const saveEditedPrice = useCallback(() => {
    if (!editingPrice) return
    const v = parseFloat(editingPrice.val.replace(',', '.'))
    if (!isNaN(v) && v >= 0) {
      setCart(c => c.map(i => i.cartId === editingPrice.id ? { ...i, prix: v } : i))
    }
    setEditingPrice(null)
  }, [editingPrice])

  // ── Payment ──
  const confirmPayment = useCallback(async () => {
    if (!tech || !centre) return
    setPaying(true)
    try {
      const now = new Date()
      const recu = payMethod === 'especes' ? parseFloat(montantRecu.replace(',','.')) || total : null
      const vente: Vente = {
        date: todayFR(),
        dateISO: now.toISOString(),
        timestamp: now.getTime(),
        tech: { nom: tech.nom, code: tech.code, centre: tech.centre, color: tech.color },
        client: client,
        items: cart.map(i => ({
          nom: i.service.nom,
          description: i.service.description,
          prix: i.prix,
          prixOriginal: i.service.prix,
        })),
        totalTTC: total,
        totalHT: parseFloat(totalHT.toFixed(2)),
        tva: parseFloat(tva.toFixed(2)),
        paiement: payMethod,
        montantRecu: recu,
        monnaie: recu !== null ? parseFloat((recu - total).toFixed(2)) : null,
        centre,
        factureNumero: null,
      }
      const ref = await addDoc(collection(db, 'ventes'), vente)
      setLastVente({ ...vente, id: ref.id })
      setShowPay(false)
      setShowSuccess(true)
    } catch(e) {
      alert('Erreur lors de la sauvegarde. Vérifiez la connexion.')
    }
    setPaying(false)
  }, [tech, centre, cart, client, payMethod, montantRecu, total, totalHT, tva])

  // ── Invoice ──
  const openClientForFacture = useCallback(() => {
    setFactureClientForm(client
      ? { ...client }
      : { nom:'', societe:'', email:'', telephone:'', adresse:'', immatriculation:'' }
    )
    setShowSuccess(false)
    setShowClientForFacture(true)
  }, [client])

  const generateFacture = useCallback(async (factureClient: Client | null) => {
    if (!lastVente) return
    const numero = genFactureNum()
    const clientData = factureClient?.nom ? factureClient : null
    const facture: Facture = {
      numero,
      date: todayFR(),
      dateISO: new Date().toISOString(),
      venteId: lastVente.id ?? '',
      vente: { ...lastVente, factureNumero: numero },
      client: clientData,
      sent: false,
      sentAt: null,
      sentTo: null,
    }
    try {
      // Sauvegarde auto du client dans la base
      if (clientData?.nom) {
        const now = new Date().toISOString()
        if (clientData.email) {
          const q = query(collection(db, 'clients'), where('email', '==', clientData.email))
          const snap = await getDocs(q)
          if (!snap.empty) {
            await updateDoc(doc(db, 'clients', snap.docs[0].id), { ...clientData, updatedAt: now })
          } else {
            await addDoc(collection(db, 'clients'), { ...clientData, createdAt: now })
          }
        } else {
          await addDoc(collection(db, 'clients'), { ...clientData, createdAt: now })
        }
      }
      const ref = await addDoc(collection(db, 'factures'), facture)
      const saved = { ...facture, id: ref.id }
      setLastFacture(saved)
      setEmailAddr(clientData?.email ?? '')
      setShowClientForFacture(false)
      setShowSuccess(false)
      setShowInvoice(true)
      setEmailSent(false)
    } catch {}
  }, [lastVente])

  const printInvoice = () => {
    if (!lastFacture) return
    const win = window.open('', '_blank')!
    win.document.write(buildInvoiceHTML(lastFacture))
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  const sendEmail = useCallback(async () => {
    if (!lastFacture || !emailAddr) return
    setSending(true)
    try {
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facture: lastFacture, to: emailAddr, html: buildInvoiceHTML(lastFacture) }),
      })
      if (res.ok) setEmailSent(true)
      else alert('Erreur envoi email')
    } catch { alert('Erreur réseau') }
    setSending(false)
  }, [lastFacture, emailAddr])

  const newSale = () => {
    setCart([])
    setClient(null)
    setLastVente(null)
    setLastFacture(null)
    setShowSuccess(false)
    setShowInvoice(false)
    setMontantRecu('')
    setEmailSent(false)
  }

  // ── Render ────────────────────────────────────────────
  return (
    <AppShell>
      <div className="flex h-full overflow-hidden" style={{ height: 'calc(100vh - 100px)' }}>

        {/* ── LEFT: Service Grid ── */}
        <div className="flex flex-col flex-1 overflow-hidden border-r border-white/10">
          {/* Category tabs */}
          <div className="flex gap-2 p-3 overflow-x-auto flex-shrink-0" style={{ background: 'rgba(0,0,0,0.1)' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setSelectedCat(cat)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 ${
                  selectedCat === cat ? 'bg-white text-dw-dark' : 'text-white/80 hover:bg-white/20 border border-white/20'
                }`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Services */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 lg:grid-cols-3 gap-3 content-start">
            {SERVICES.filter(s => s.categorie === selectedCat).map(s => (
              <button key={s.id} onClick={() => addToCart(s.id)}
                className="glass rounded-xl p-4 text-left hover:bg-white/20 active:scale-95 transition-all">
                <p className="font-bold text-white text-sm leading-tight">{s.nom}</p>
                {s.description && <p className="text-white/50 text-xs mt-1 leading-tight">{s.description}</p>}
                <p className="text-dw-pale font-black text-xl mt-2">{fmt(s.prix)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Cart ── */}
        <div className="w-72 lg:w-80 flex flex-col" style={{ background: 'rgba(0,0,0,0.15)' }}>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/30">
                <p className="text-4xl mb-2">🛒</p>
                <p className="text-sm">Panier vide</p>
              </div>
            ) : cart.map(item => (
              <div key={item.cartId} className="glass rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white text-sm font-semibold leading-tight flex-1">{item.service.nom}</p>
                  <button onClick={() => removeFromCart(item.cartId)}
                    className="text-white/40 hover:text-red-300 transition-colors text-lg leading-none flex-shrink-0">
                    ×
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  {editingPrice?.id === item.cartId ? (
                    <div className="flex gap-1 flex-1">
                      <input
                        autoFocus
                        className="w-24 bg-white/20 rounded-lg px-2 py-1 text-white text-sm font-bold outline-none"
                        value={editingPrice.val}
                        onChange={e => setEditingPrice({ id: item.cartId, val: e.target.value })}
                        onKeyDown={e => { if(e.key==='Enter') saveEditedPrice(); if(e.key==='Escape') setEditingPrice(null) }}
                      />
                      <button onClick={saveEditedPrice}
                        className="px-2 py-1 bg-white/20 rounded-lg text-xs text-white font-bold">✓</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingPrice({ id: item.cartId, val: String(item.prix) })}
                      className="text-dw-pale font-black text-base hover:text-white transition-colors">
                      {fmt(item.prix)}
                      {item.prix !== item.service.prix && (
                        <span className="text-white/40 line-through text-xs ml-1">{fmt(item.service.prix)}</span>
                      )}
                    </button>
                  )}
                  <span className="text-white/30 text-xs">✏️</span>
                </div>
              </div>
            ))}
          </div>

          {/* Client */}
          <div className="px-3 pb-2">
            <button onClick={() => setShowClientModal(true)}
              className="w-full glass rounded-xl px-3 py-2 text-left text-sm transition-all hover:bg-white/20">
              {client ? (
                <span className="text-white font-semibold">👤 {client.nom}{client.societe ? ` · ${client.societe}` : ''}</span>
              ) : (
                <span className="text-white/50">+ Ajouter un client (optionnel)</span>
              )}
            </button>
          </div>

          {/* Total + Pay */}
          <div className="p-3 border-t border-white/10">
            <div className="flex justify-between mb-1 text-sm text-white/60">
              <span>Total HT</span><span>{fmt(totalHT)}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm text-white/60">
              <span>TVA 20%</span><span>{fmt(tva)}</span>
            </div>
            <div className="flex justify-between mb-3 text-xl font-black text-white">
              <span>Total TTC</span><span className="text-dw-pale">{fmt(total)}</span>
            </div>
            <button onClick={() => { if(cart.length > 0) setShowPay(true) }}
              disabled={cart.length === 0}
              className="w-full py-4 rounded-xl font-black text-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: cart.length > 0 ? 'rgba(255,255,255,0.9)' : undefined, color: '#14532D' }}>
              PAYER {cart.length > 0 ? fmt(total) : ''}
            </button>
          </div>
        </div>
      </div>

      {/* ── PAYMENT MODAL ── */}
      {showPay && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
             style={{ background: 'rgba(0,0,0,0.6)' }}
             onClick={e => { if(e.target === e.currentTarget) setShowPay(false) }}>
          <div className="glass rounded-2xl p-6 w-full max-w-sm animate-popIn">
            <h2 className="text-xl font-black text-white mb-4 text-center">Paiement</h2>

            {/* Method */}
            <div className="flex gap-2 mb-5">
              {(['especes','carte'] as const).map(m => (
                <button key={m} onClick={() => setPayMethod(m)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    payMethod === m ? 'bg-white text-dw-dark' : 'text-white border border-white/30 hover:bg-white/20'
                  }`}>
                  {m === 'especes' ? '💵 Espèces' : '💳 Carte'}
                </button>
              ))}
            </div>

            {/* Espèces: enter amount */}
            {payMethod === 'especes' && (
              <div className="mb-4">
                <label className="text-white/70 text-sm block mb-1">Montant reçu (€)</label>
                <input
                  className="w-full bg-white/20 rounded-xl px-4 py-3 text-white text-2xl font-bold outline-none text-center"
                  placeholder={fmt(total)}
                  value={montantRecu}
                  onChange={e => setMontantRecu(e.target.value)}
                  inputMode="decimal"
                />
                {montantRecu && parseFloat(montantRecu.replace(',','.')) >= total && (
                  <p className="text-center text-dw-pale font-bold mt-2 text-lg">
                    Monnaie: {fmt(parseFloat(montantRecu.replace(',','.'))-total)}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between text-white mb-4">
              <span className="text-white/60">Total TTC</span>
              <span className="font-black text-xl text-dw-pale">{fmt(total)}</span>
            </div>

            <button onClick={confirmPayment} disabled={paying}
              className="w-full py-4 rounded-xl font-black text-lg bg-white text-dw-dark active:scale-95 transition-all disabled:opacity-60">
              {paying ? '...' : 'Confirmer le paiement'}
            </button>
            <button onClick={() => setShowPay(false)}
              className="w-full mt-2 py-2 rounded-xl text-white/60 text-sm hover:text-white transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── SUCCESS MODAL ── */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
             style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="glass rounded-2xl p-8 w-full max-w-sm animate-popIn text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-black text-white mb-2">Paiement enregistré !</h2>
            <p className="text-white/60 mb-6">
              {fmt(total)} · {payMethod === 'especes' ? 'Espèces' : 'Carte bancaire'}
            </p>
            <button onClick={openClientForFacture}
              className="w-full py-3 rounded-xl font-bold mb-2 bg-white text-dw-dark hover:bg-white/90 active:scale-95 transition-all">
              📄 Générer une facture
            </button>
            <button onClick={newSale}
              className="w-full py-3 rounded-xl font-bold text-white border border-white/30 hover:bg-white/20 active:scale-95 transition-all">
              🧾 Nouvelle vente
            </button>
          </div>
        </div>
      )}

      {/* ── INVOICE MODAL ── */}
      {showInvoice && lastFacture && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
             style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="glass rounded-2xl w-full max-w-lg flex flex-col animate-popIn" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h2 className="font-black text-white">Facture {lastFacture.numero}</h2>
                <p className="text-white/60 text-sm">{lastFacture.date} · {centre}</p>
              </div>
              <button onClick={() => { setShowInvoice(false); newSale() }}
                className="text-white/40 hover:text-white text-2xl transition-colors">×</button>
            </div>

            {/* Invoice preview */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="bg-white rounded-xl p-5 text-gray-800 text-sm">
                <div className="flex justify-between mb-4">
                  <div>
                    <p className="font-black text-dw-primary text-lg">Dreamwash</p>
                    <p className="text-gray-500 text-xs">{COMPANY.adresse}</p>
                    <p className="text-gray-500 text-xs">{COMPANY.telephone}</p>
                    <p className="text-gray-400 text-xs">SIRET: {COMPANY.siret}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-400 text-xs uppercase">Facture</p>
                    <p className="font-bold text-sm">{lastFacture.numero}</p>
                    <p className="text-gray-500 text-xs">{lastFacture.date}</p>
                    <span className="inline-block bg-dw-mid/20 text-dw-primary px-2 py-0.5 rounded-full text-xs font-bold mt-1">
                      {lastFacture.vente.paiement === 'especes' ? 'Espèces' : 'Carte'}
                    </span>
                  </div>
                </div>

                {lastFacture.client && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Facturer à</p>
                    <p className="font-bold">{lastFacture.client.nom}{lastFacture.client.societe ? ` · ${lastFacture.client.societe}` : ''}</p>
                    {lastFacture.client.adresse && <p className="text-gray-500 text-xs">{lastFacture.client.adresse}</p>}
                    {lastFacture.client.email && <p className="text-gray-500 text-xs">{lastFacture.client.email}</p>}
                    {lastFacture.client.immatriculation && <p className="text-gray-700 text-xs font-bold mt-1">🚗 {lastFacture.client.immatriculation.toUpperCase()}</p>}
                  </div>
                )}

                <table className="w-full mb-3">
                  <thead><tr className="border-b-2 border-dw-mid">
                    <th className="text-left py-1 text-xs text-gray-400 font-bold uppercase">Prestation</th>
                    <th className="text-right py-1 text-xs text-gray-400 font-bold uppercase">Prix TTC</th>
                  </tr></thead>
                  <tbody>
                    {lastFacture.vente.items.map((it, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2">
                          <p className="font-semibold text-sm">{it.nom}</p>
                          {it.description && <p className="text-gray-400 text-xs">{it.description}</p>}
                        </td>
                        <td className="py-2 text-right font-bold">{fmt(it.prix)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="text-right space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Total HT</span><span>{fmt(lastFacture.vente.totalHT)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>TVA 20%</span><span>{fmt(lastFacture.vente.tva)}</span>
                  </div>
                  <div className="flex justify-between font-black text-base text-dw-primary border-t-2 border-dw-mid pt-1 mt-1">
                    <span>Total TTC</span><span>{fmt(lastFacture.vente.totalTTC)}</span>
                  </div>
                </div>
              </div>

              {/* Email section */}
              <div className="mt-4 glass rounded-xl p-4">
                <p className="text-white/70 text-sm font-semibold mb-2">📧 Envoyer par email</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="email@client.fr"
                    value={emailAddr}
                    onChange={e => setEmailAddr(e.target.value)}
                    className="flex-1 bg-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none placeholder-white/40"
                  />
                  <button onClick={sendEmail} disabled={sending || !emailAddr || emailSent}
                    className="px-4 py-2 bg-white text-dw-dark rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-white/90 active:scale-95 transition-all">
                    {sending ? '...' : emailSent ? '✓' : 'Envoyer'}
                  </button>
                </div>
                {emailSent && <p className="text-dw-pale text-sm mt-2 font-semibold">✓ Email envoyé avec succès</p>}
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-white/10">
              <button onClick={printInvoice}
                className="flex-1 py-3 rounded-xl font-bold text-white border border-white/30 hover:bg-white/20 active:scale-95 transition-all">
                🖨️ Imprimer
              </button>
              <button onClick={() => { setShowInvoice(false); newSale() }}
                className="flex-1 py-3 rounded-xl font-bold bg-white text-dw-dark hover:bg-white/90 active:scale-95 transition-all">
                Nouvelle vente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLIENT POUR FACTURE MODAL ── */}
      {showClientForFacture && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
             style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="glass rounded-2xl w-full max-w-md animate-popIn flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
              <div>
                <h2 className="text-lg font-black text-white">Informations client</h2>
                <p className="text-white/50 text-xs mt-0.5">Optionnel — pour la facture</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {[
                { field: 'nom',             label: 'Nom',                  type: 'text',  placeholder: 'Jean Dupont' },
                { field: 'societe',         label: 'Société',              type: 'text',  placeholder: 'Ma Société SAS' },
                { field: 'email',           label: 'Email',                type: 'email', placeholder: 'jean@email.fr' },
                { field: 'telephone',       label: 'Téléphone',            type: 'tel',   placeholder: '06 12 34 56 78' },
                { field: 'adresse',         label: 'Adresse',              type: 'text',  placeholder: '12 rue de la Paix, Paris' },
                { field: 'immatriculation', label: '🚗 Immatriculation',   type: 'text',  placeholder: 'AB-123-CD' },
              ].map(({ field, label, type, placeholder }) => (
                <div key={field}>
                  <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={(factureClientForm as unknown as Record<string, string>)[field] || ''}
                    onChange={e => setFactureClientForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full mt-1 bg-white/20 rounded-xl px-3 py-2.5 text-white text-sm outline-none placeholder-white/30 border border-white/10 focus:border-white/30 transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="px-5 pb-5 pt-3 border-t border-white/10 flex flex-col gap-2">
              <button
                onClick={() => generateFacture(factureClientForm)}
                disabled={!factureClientForm.nom}
                className="w-full py-3 rounded-xl bg-white text-dw-dark font-black text-sm active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                📄 Générer la facture
              </button>
              <button
                onClick={() => generateFacture(null)}
                className="w-full py-2.5 rounded-xl text-white/70 border border-white/20 hover:bg-white/10 font-semibold text-sm active:scale-95 transition-all">
                Générer sans client
              </button>
              <button
                onClick={() => { setShowClientForFacture(false); setShowSuccess(true) }}
                className="w-full py-2 text-white/40 hover:text-white/70 text-sm transition-colors">
                ← Retour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLIENT MODAL ── */}
      {showClientModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
             style={{ background: 'rgba(0,0,0,0.7)' }}
             onClick={e => { if(e.target === e.currentTarget) setShowClientModal(false) }}>
          <div className="glass rounded-2xl p-5 w-full max-w-md animate-popIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white">Client</h2>
              <button onClick={() => setShowClientModal(false)} className="text-white/40 hover:text-white text-xl">×</button>
            </div>

            <div className="space-y-3">
              {[
                { field: 'nom',             label: 'Nom *',               type: 'text' },
                { field: 'societe',         label: 'Société',             type: 'text' },
                { field: 'email',           label: 'Email',               type: 'email' },
                { field: 'telephone',       label: 'Téléphone',           type: 'tel' },
                { field: 'adresse',         label: 'Adresse',             type: 'text' },
                { field: 'immatriculation', label: '🚗 Immatriculation',  type: 'text' },
              ].map(({ field, label, type }) => (
                <div key={field}>
                  <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">{label}</label>
                  <input
                    type={type}
                    value={(clientForm as unknown as Record<string, string>)[field]}
                    onChange={e => setClientForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full mt-1 bg-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none placeholder-white/40"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              {client && (
                <button onClick={() => { setClient(null); setShowClientModal(false) }}
                  className="px-4 py-2 rounded-xl text-white/60 border border-white/20 hover:bg-white/10 text-sm font-semibold">
                  Retirer
                </button>
              )}
              <button
                onClick={() => {
                  if (!clientForm.nom) return
                  setClient({ ...clientForm })
                  setShowClientModal(false)
                }}
                className="flex-1 py-2 rounded-xl bg-white text-dw-dark font-bold text-sm active:scale-95 transition-all">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
