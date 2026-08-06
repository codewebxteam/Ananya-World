import { initializeApp, getApps, getApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; 
// Note: Analytics is commented out because firebase/analytics relies on browser APIs 
// and will crash in React Native (Expo Go) by default unless running on Web.

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase (checking if already initialized to prevent errors on hot-reload)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// export const analytics = getAnalytics(app); // Only enable if deploying to web

export { app };
