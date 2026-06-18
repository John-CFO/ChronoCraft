///////////////////AuthContext.tsx////////////////////

// This file is used to create the auth context to use it inside the LoginScreen and App.tsx

//////////////////////////////////////////////////////

import React, { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { FIREBASE_AUTH } from "../../firebaseConfig";

//////////////////////////////////////////////////////

// AuthStage: loggedOut → pendingMfa → authenticated
export type AuthStage = "loggedOut" | "pendingMfa" | "authenticated";

// function to create the auth context
export const AuthContext = React.createContext<any>(null);

// function to create the auth provider
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [stage, setStage] = useState<AuthStage>("loggedOut");
  const [isMFAEnabled, setMFAEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // get the user auth token from firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(FIREBASE_AUTH, async (firebaseUser) => {
      if (firebaseUser) {
        await firebaseUser.getIdToken(true);
        setUser(firebaseUser);
        setStage("authenticated");
      } else {
        setUser(null);
        setStage("loggedOut");
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  // return the auth context and the children
  return (
    <AuthContext.Provider
      value={{
        user,
        stage,
        setUser,
        setStage,
        isMFAEnabled,
        setMFAEnabled,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
