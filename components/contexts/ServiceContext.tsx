//////////////////////////////ServiceContext.tsx////////////////////////////////////

// This file contains the ServiceProvider component and the useService hook

////////////////////////////////////////////////////////////////////////////////////

import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { nanoid } from "nanoid/non-secure";

////////////////////////////////////////////////////////////////////////////////////

interface ServiceContextType {
  serviceId: string | null;
  initService: () => Promise<void>;
}

////////////////////////////////////////////////////////////////////////////////////

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // declare state
  const [serviceId, setServiceId] = useState<string | null>(null);

  // initialize the service
  const initService = async () => {
    // get the serviceId from secure store
    let storedServiceId = await SecureStore.getItemAsync("serviceId");
    // conditionally set the serviceId
    if (!storedServiceId) {
      storedServiceId = nanoid();
      await SecureStore.setItemAsync("serviceId", storedServiceId);
    }
    setServiceId(storedServiceId);
  };

  // hook to initialize the service
  useEffect(() => {
    initService();
  }, []);

  return (
    <ServiceContext.Provider value={{ serviceId, initService }}>
      {children}
    </ServiceContext.Provider>
  );
};

// export the useService hook
export const useService = () => {
  // get the context
  const context = useContext(ServiceContext);
  // error if not in context
  if (!context)
    throw new Error("useService must be used within ServiceProvider");
  return context;
};
