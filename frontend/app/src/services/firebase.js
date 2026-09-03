import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'appId']

export const firebaseConfigured = requiredConfig.every((key) => Boolean(firebaseConfig[key]?.trim()))
export const firebaseApp = firebaseConfigured
  ? (getApps()[0] || initializeApp(firebaseConfig))
  : null
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null

if (firebaseAuth) firebaseAuth.languageCode = 'fr'
