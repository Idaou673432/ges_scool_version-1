import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import configData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: configData.apiKey,
  authDomain: configData.authDomain,
  projectId: configData.projectId,
  storageBucket: configData.storageBucket,
  messagingSenderId: configData.messagingSenderId,
  appId: configData.appId,
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Use named firestore database if configured
export const db = configData.firestoreDatabaseId && configData.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, configData.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Attempt anonymous sign-in to guarantee permissions and connection on web clients (e.g. Vercel)
try {
  signInAnonymously(auth).catch((err) => {
    console.info('Firebase auth session notice:', err?.code || err?.message || 'ready');
  });
} catch (e) {
  // ignore
}

export default app;
