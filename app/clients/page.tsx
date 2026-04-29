'use client'
import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Client } from '@/types'
import AppShell from '@/components/AppShell'

const EMPTY: Client = { nom: '', societe: '', email: '', telephone: '', adresse: '', immatriculation: '' }

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState<Client>(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('nom'))
    const unsub = onSnapshot(q, snap => {
      setClients(snap.docs.map(d => ({ ...d.data() as Client, id: d.id })))
    })
    return unsub
  }, [])

  const filtered = clients.filter(c =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    c.societe?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (c: Client) => { setEditing(c); setForm({ ...c }); setShowModal(true) }

  const save = async () => {
    if (!form.nom) return
    setSaving(true)
    try {
      if (editing?.id) {
        await updateDoc(doc(db, 'clients', editing.id), { ...form, updatedAt: new Date().toISOString() })
      } else {
        await addDoc(collection(db, 'clients'), { ...form, createdAt: new Date().toISOString() })
      }
      setShowModal(false)
    } catch { alert('Erreur lors de la sauvegarde') }
    setSaving(false)
  }

  const fields: { field: keyof Client; label: string; type: string }[] = [
    { field: 'nom',             label: 'Nom *',              type: 'text' },
    { field: 'societe',         label: 'Société',            type: 'text' },
    { field: 'email',           label: 'Email',              type: 'email' },
    { field: 'telephone',       label: 'Téléphone',          type: 'tel' },
    { field: 'adresse',         label: 'Adresse',            type: 'text' },
    { field: 'immatriculation', label: '🚗 Immatriculation', type: 'text' },
  ]

  return (
    <AppShell>
      <div className="flex flex-col h-full p-4" style={{ height: 'calc(100vh - 100px)' }}>
        {/* Top bar */}
        <div className="flex gap-3 mb-4 flex-shrink-0">
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 glass rounded-xl px-4 py-2.5 text-white placeholder-white/40 outline-none text-sm"
          />
          <button onClick={openNew}
            className="px-4 py-2.5 bg-white text-dw-dark rounded-xl font-bold text-sm hover:bg-white/90 active:scale-95 transition-all">
            + Nouveau client
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/30">
              <p className="text-4xl mb-2">👤</p>
              <p>{search ? 'Aucun résultat' : 'Aucun client enregistré'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(c => (
                <button key={c.id} onClick={() => openEdit(c)}
                  className="glass rounded-xl p-4 text-left hover:bg-white/20 transition-all active:scale-95">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {c.nom.slice(0,1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm leading-tight">{c.nom}</p>
                      {c.societe && <p className="text-white/60 text-xs">{c.societe}</p>}
                    </div>
                  </div>
                  {c.email && <p className="text-white/50 text-xs truncate">✉ {c.email}</p>}
                  {c.telephone && <p className="text-white/50 text-xs">☎ {c.telephone}</p>}
                  {c.adresse && <p className="text-white/50 text-xs truncate">📍 {c.adresse}</p>}
                  {c.immatriculation && <p className="text-white/70 text-xs font-bold">🚗 {c.immatriculation.toUpperCase()}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
             style={{ background: 'rgba(0,0,0,0.7)' }}
             onClick={e => { if(e.target === e.currentTarget) setShowModal(false) }}>
          <div className="glass rounded-2xl p-5 w-full max-w-md animate-popIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white">
                {editing ? 'Modifier le client' : 'Nouveau client'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white text-xl">×</button>
            </div>

            <div className="space-y-3">
              {fields.map(({ field, label, type }) => (
                <div key={field}>
                  <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">{label}</label>
                  <input
                    type={type}
                    value={(form[field] as string) || ''}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full mt-1 bg-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none placeholder-white/40"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-white/60 border border-white/20 hover:bg-white/10 text-sm font-semibold">
                Annuler
              </button>
              <button onClick={save} disabled={!form.nom || saving}
                className="flex-1 py-2 rounded-xl bg-white text-dw-dark font-bold text-sm active:scale-95 transition-all disabled:opacity-50">
                {saving ? 'Sauvegarde...' : editing ? 'Enregistrer' : 'Créer le client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
