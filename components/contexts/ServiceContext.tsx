//////////////////////////////ServiceContext.tsx////////////////////////////////////

// This file contains the ServiceProvider component and the useService hook

////////////////////////////////////////////////////////////////////////////////////

import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, getDocsFromServer } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../../firebaseConfig";
import { logError } from "../../lib/loggerClient";

/////////////////////////////////////////////////////////////////////////////////

interface ServiceContextType {
  serviceId: string | null;
  loading: boolean;
  ready: boolean;
  reloadService: () => Promise<void>;
}

/////////////////////////////////////////////////////////////////////////////////

// Create the context
const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

// Create the provider
export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  // hokk to run when the component mounts
  useEffect(() => {
    let active = true;

    const run = async (user: any) => {
      if (!user?.uid) {
        setServiceId(null);
        setReady(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setReady(false);

      try {
        const servicesRef = collection(
          FIREBASE_FIRESTORE,
          "Users",
          user.uid,
          "Services",
        );

        let snapshot = await getDocsFromServer(servicesRef);
        // let's try the snapshot 5 times until we get a result (expects a servideId)
        for (let attempt = 1; snapshot.empty && attempt < 5; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 500));

          snapshot = await getDocsFromServer(servicesRef);
        }

        if (!active) return;

        if (snapshot.empty) {
          setServiceId(null);
          setReady(false);
          setLoading(false);
          return;
        }

        setServiceId(snapshot.docs[0].id);
        setReady(true);
        setLoading(false);
      } catch (err) {
        if (!active) return;

        logError("ServiceContext/load", err);
        setServiceId(null);
        setReady(false);
        setLoading(false);
      }
    };

    const unsub = onAuthStateChanged(FIREBASE_AUTH, (user) => {
      run(user);
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  // function to reload the service to ensure it's up to date
  const reloadService = async () => {
    const user = FIREBASE_AUTH.currentUser;

    if (!user?.uid) {
      setServiceId(null);
      setReady(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setReady(false);

    try {
      const servicesRef = collection(
        FIREBASE_FIRESTORE,
        "Users",
        user.uid,
        "Services",
      );

      const snapshot = await getDocsFromServer(servicesRef);

      if (snapshot.empty) {
        setServiceId(null);
        setReady(false);
        setLoading(false);
        return;
      }

      setServiceId(snapshot.docs[0].id);
      setReady(true);
      setLoading(false);
    } catch (err) {
      logError("ServiceContext/reloadService", err);
      setServiceId(null);
      setReady(false);
      setLoading(false);
    }
  };

  return (
    <ServiceContext.Provider
      value={{ serviceId, loading, ready, reloadService }}
    >
      {children}
    </ServiceContext.Provider>
  );
};

export const useService = () => {
  const context = useContext(ServiceContext);

  if (!context) {
    throw new Error("useService must be used within ServiceProvider");
  }

  return context;
};
