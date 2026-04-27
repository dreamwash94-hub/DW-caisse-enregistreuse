import { Service } from '@/types'

export const CENTRES = [
  'Belleville',
  'Aeroville A',
  'Aeroville B',
  'Lafayette Rouge',
  'Lafayette Vert',
  'Malakoff',
  'Suresnes',
]

export const CATEGORIES = [
  'Lavage Complet',
  'Lavage Extérieur',
  'Lavage Intérieur',
  'Suppléments',
]

export const SERVICES: Service[] = [
  { id: 'lc-large',  nom: 'Lavage Complet Large',           description: 'Lavage extérieur et intérieur',                          prix: 65, categorie: 'Lavage Complet' },
  { id: 'lc-medium', nom: 'Lavage Complet Medium',          description: 'Lavage extérieur et intérieur',                          prix: 55, categorie: 'Lavage Complet' },
  { id: 'lc-small',  nom: 'Lavage Complet Small',           description: 'Lavage extérieur et intérieur',                          prix: 45, categorie: 'Lavage Complet' },
  { id: 'le-large',  nom: 'Lavage Extérieur Large',         description: 'Nettoyage carrosserie, vitres, jantes',                  prix: 35, categorie: 'Lavage Extérieur' },
  { id: 'le-medium', nom: 'Lavage Extérieur Medium',        description: 'Nettoyage carrosserie, vitres, jantes',                  prix: 30, categorie: 'Lavage Extérieur' },
  { id: 'le-small',  nom: 'Lavage Extérieur Small',         description: 'Nettoyage carrosserie, vitres, jantes',                  prix: 25, categorie: 'Lavage Extérieur' },
  { id: 'li-large',  nom: 'Lavage Intérieur Large',         description: 'Aspirateur et nettoyage des surfaces intérieures',       prix: 35, categorie: 'Lavage Intérieur' },
  { id: 'li-medium', nom: 'Lavage Intérieur Medium',        description: 'Aspirateur et nettoyage des surfaces intérieures',       prix: 30, categorie: 'Lavage Intérieur' },
  { id: 'li-small',  nom: 'Lavage Intérieur Small',         description: 'Aspirateur et nettoyage des surfaces intérieures',       prix: 25, categorie: 'Lavage Intérieur' },
  { id: 'sup-prest', nom: 'Supplément prestation',          description: '',                                                        prix: 10, categorie: 'Suppléments' },
  { id: 'sup-shamp', nom: 'Supplément Shampoing Sièges',    description: 'Nettoyage en profondeur des sièges',                     prix: 45, categorie: 'Suppléments' },
  { id: 'sup-cuir',  nom: 'Supplément Traitement Cuir',     description: 'Nettoyage et traitement des surfaces en cuir',           prix: 20, categorie: 'Suppléments' },
  { id: 'sup-sale',  nom: 'Supplément véhicule très sale',  description: '',                                                        prix: 15, categorie: 'Suppléments' },
]

export const COMPANY = {
  nom: 'Dreamwash',
  adresse: '54 avenue Henri Barbusse, Drancy 93700',
  email: 'reservation@dreamwash.fr',
  telephone: '07 82 48 43 00',
  siret: '977 739 242 R.C.S Bobigny',
}

export const fmt = (n: number) =>
  n.toFixed(2).replace('.', ',') + ' €'
