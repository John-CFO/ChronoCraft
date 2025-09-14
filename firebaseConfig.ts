import { initializeApp, getApps, FirebaseApp, deleteApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// delete existing Firebase-Apps
getApps().forEach((app) => deleteApp(app));

// initialize new Firebase-App
const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);

// initialize Auth
const auth: Auth = (() => {
  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e: any) {
    if (e.code === "auth/already-initialized") return getAuth(firebaseApp);
    throw e;
  }
})();

// initialize Firestore and Storage
const firestore: Firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

// Auth Monitoring
auth.onAuthStateChanged((user) => {
  if (!user) {
    /* handle unauthenticated */
  }
});

export {
  firebaseApp as FIREBASE_APP,
  auth as FIREBASE_AUTH,
  firestore as FIREBASE_FIRESTORE,
  storage as FIREBASE_STORAGE,
};
