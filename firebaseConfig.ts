/////////////////////////////// firebaseConfig.ts //////////////////////////////

// This file is used to configure the Firebase SDK

////////////////////////////////////////////////////////////////////////////////

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getFunctions,
  Functions,
  connectFunctionsEmulator,
} from "firebase/functions";
import { getStorage } from "firebase/storage";
import { connectStorageEmulator } from "firebase/storage";
import { connectAuthEmulator } from "firebase/auth";

// //////////////////////////////////////////////////////////////////////////////////

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// // initialize new Firebase-App
const app: FirebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const FIREBASE_APP = app;

let auth;

try {
  const {
    initializeAuth,
    getReactNativePersistence,
  } = require("firebase/auth/react-native");

  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  const { getAuth } = require("firebase/auth");
  auth = getAuth(app);
}

const firestore: Firestore = getFirestore(app);
const functions: Functions = getFunctions(app, "us-central1");
const storage = getStorage(app);

// Dev mode - connect to emulators
// if (__DEV__) {
//   const host = "10.0.2.2";

//   connectFirestoreEmulator(firestore, host, 8001);
//   connectFunctionsEmulator(functions, host, 4001);
//   connectAuthEmulator(auth, `http://${host}:5001/`);
//   connectStorageEmulator(storage, host, 9199);
//   console.log("🔥 Connected to Firebase Emulators");
// }

export const FIREBASE_AUTH = auth;
export const FIREBASE_FIRESTORE = firestore;
export const FIREBASE_FUNCTIONS = functions;
export const FIREBASE_STORAGE = storage;
