import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyD7I8zcU_JakB9NjJDo4cuUMAP6MvPcxhk",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "shabey-ce4be.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "shabey-ce4be",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "shabey-ce4be.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "732785567614",
  appId: process.env.FIREBASE_APP_ID || "1:732785567614:web:7e6bddfcbd37a8e4dd752f",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-JJQQSNVXT9",
};

// Initialize Firebase App safely across client transitions
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export default app;
