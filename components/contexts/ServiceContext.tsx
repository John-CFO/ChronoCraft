//////////////////////////////ServiceContext.tsx////////////////////////////////////

// This file contains the ServiceProvider component and the useService hook

////////////////////////////////////////////////////////////////////////////////////

import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../../firebaseConfig";

// ////////////////////////////////////////////////////////////////////////////////////

interface ServiceContextType {
  serviceId: string | null;
  loading: boolean;
}

// ////////////////////////////////////////////////////////////////////////////////////

// Create the context
const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

// Create the provider
export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, async (user) => {
      if (!user) {
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

        if (snapshot.empty) {
          const newServiceRef = await addDoc(servicesRef, {
            createdAt: new Date(),
          });

          setServiceId(newServiceRef.id);
        } else {
          setServiceId(snapshot.docs[0].id);
        }
      } catch (err) {
        console.error("Service init failed", err);
        setServiceId(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
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
