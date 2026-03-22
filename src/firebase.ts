import { initializeApp, getApps } from 'firebase/app'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

function getEnv(value: string | undefined, name: string): string {
  if (!value) {
    console.warn(`Missing env var: ${name}. Firebase features will be disabled.`);
    return 'MISSING';
  }
  return value
}

const firebaseConfig = {
  apiKey: getEnv(import.meta.env.VITE_FIREBASE_API_KEY, 'VITE_FIREBASE_API_KEY'),
  authDomain: getEnv(
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    'VITE_FIREBASE_AUTH_DOMAIN',
  ),
  projectId: getEnv(
    import.meta.env.VITE_FIREBASE_PROJECT_ID,
    'VITE_FIREBASE_PROJECT_ID',
  ),
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  storageBucket: getEnv(
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    'VITE_FIREBASE_STORAGE_BUCKET',
  ),
  messagingSenderId: getEnv(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
  ),
  appId: getEnv(import.meta.env.VITE_FIREBASE_APP_ID, 'VITE_FIREBASE_APP_ID'),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const isConfigValid = Object.values(firebaseConfig).every(v => v !== 'MISSING' || v === undefined);

let app;
if (isConfigValid) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
} else {
  // Mock or null app if config is invalid to prevent crash
  app = null;
}

export const auth = app ? getAuth(app) : null as any
export const db = app ? getFirestore(app) : null as any
export const storage = app ? getStorage(app) : null as any
export let analytics: Analytics | null = null

if (app && typeof window !== 'undefined') {
  isSupported()
    .then((ok) => {
      if (ok && app) analytics = getAnalytics(app)
    })
    .catch(() => {
      analytics = null
    })
}

