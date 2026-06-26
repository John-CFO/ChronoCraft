//////////////////////////////ServiceContext.tsx////////////////////////////////////

// This file contains the ServiceProvider component and the useService hook

////////////////////////////////////////////////////////////////////////////////////

import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../../firebaseConfig";
import { logError } from "../../lib/loggerClient";

/////////////////////////////////////////////////////////////////////////////////

interface ServiceContextType {
  serviceId: string | null;
  loading: boolean;
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

  useEffect(() => {
    let active = true;

    const run = async (user: any) => {
      if (!user?.uid) {
        setServiceId(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const servicesRef = collection(
          FIREBASE_FIRESTORE,
          "Users",
          user.uid,
          "Services",
        );

        const snapshot = await getDocs(servicesRef);
        if (!active) return;

        if (snapshot.empty) {
          setServiceId(null);
          setLoading(true);
          return;
        }

        setServiceId(snapshot.docs[0].id);
        setLoading(false);
      } catch (err) {
        if (!active) return;

        logError("ServiceContext/load", err);
        setServiceId(null);
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

  return (
    <ServiceContext.Provider value={{ serviceId, loading }}>
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
