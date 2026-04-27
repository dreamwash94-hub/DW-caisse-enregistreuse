import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCSZqfL3G-DK0VzNmptblT7F_kgq5R4Oww',
  authDomain: 'dreamwash-d4a2c.firebaseapp.com',
  projectId: 'dreamwash-d4a2c',
  storageBucket: 'dreamwash-d4a2c.firebasestorage.app',
  messagingSenderId: '294836515742',
  appId: '1:294836515742:web:3fdbe1b28db8f97b7cdc8f',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const db = getFirestore(app)
