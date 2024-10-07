import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAnalytics, isSupported } from "firebase/analytics";

console.log("Firebase API Key:", process.env.REACT_APP_FIREBASE_API_KEY);

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// initialize Firebase-App only if it hasn't been initialized yet
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // use existing app
}

// initialize Auth only if it hasn't been initialized yet
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e: any) {
  if (e.code === "auth/already-initialized") {
    auth = getAuth(app);
  } else {
    throw e; // delete other errors
  }
}

// initialize Firestore
const firestore: Firestore = getFirestore(app);

// initialize Analytics when supported
isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});

// use Auth instance to check if user is logged in
const authInstance: Auth = getAuth(app);

// monitoring Auth status
authInstance.onAuthStateChanged((user) => {
  if (!user) {
    // Handle the case when the user is not authenticated
  }
});

// export instance
export {
  app as FIREBASE_APP,
  authInstance as FIREBASE_AUTH,
  firestore as FIREBASE_FIRESTORE,
};
