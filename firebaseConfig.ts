/////////////////////////////// firebaseConfig.ts //////////////////////////////

// This file is used to configure the Firebase SDK

////////////////////////////////////////////////////////////////////////////////

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  Auth,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getFunctions,
  Functions,
  connectFunctionsEmulator,
} from "firebase/functions";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "firebase/messaging";

//////////////////////////////////////////////////////////////////////////////////

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// initialize new Firebase-App
const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// initialize Auth
const auth: Auth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// initialize Firestore, functions and Storage
const firestore: Firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const functions: Functions = getFunctions(firebaseApp, "us-central1");

// Dev mode - connect to emulators
if (__DEV__) {
  const host = "10.0.2.2";

  connectFirestoreEmulator(firestore, host, 8001);
  connectFunctionsEmulator(functions, host, 4001);
  connectAuthEmulator(auth, `http://${host}:5001/`);
  console.log("🔥 Connected to Firebase Emulators");
}

export {
  firebaseApp as FIREBASE_APP,
  auth as FIREBASE_AUTH,
  firestore as FIREBASE_FIRESTORE,
  storage as FIREBASE_STORAGE,
  functions as FIREBASE_FUNCTIONS,
};
