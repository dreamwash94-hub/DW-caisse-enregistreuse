export interface Tech {
  nom: string
  code: string
  centre: string
  color: string
  poste: string
  statut?: string
}

export interface Service {
  id: string
  nom: string
  description: string
  prix: number
  categorie: string
}

export interface CartItem {
  cartId: string
  service: Service
  prix: number
}

export interface Client {
  id?: string
  nom: string
  societe: string
  email: string
  telephone: string
  adresse: string
  createdAt?: string
}

export interface VenteItem {
  nom: string
  description: string
  prix: number
  prixOriginal: number
}

export interface Vente {
  id?: string
  date: string
  dateISO: string
  timestamp: number
  tech: { nom: string; code: string; centre: string; color: string }
  client: Client | null
  items: VenteItem[]
  totalTTC: number
  totalHT: number
  tva: number
  paiement: 'especes' | 'carte'
  montantRecu: number | null
  monnaie: number | null
  centre: string
  factureNumero: string | null
}

export interface Facture {
  id?: string
  numero: string
  date: string
  dateISO: string
  venteId: string
  vente: Vente
  client: Client | null
  sent: boolean
  sentAt: string | null
  sentTo: string | null
}
