// //////////////////////////////ServiceContext.tsx////////////////////////////////////

// // This file contains the ServiceProvider component and the useService hook

// ////////////////////////////////////////////////////////////////////////////////////

// import React, { createContext, useContext, useState, useEffect } from "react";
// import { collection, getDocs, getDocsFromServer } from "firebase/firestore";
// import { onAuthStateChanged } from "firebase/auth";

// import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../../firebaseConfig";
// import { logError } from "../../lib/loggerClient";

// /////////////////////////////////////////////////////////////////////////////////

// interface ServiceContextType {
//   serviceId: string | null;
//   loading: boolean;
//   ready: boolean;
//   reloadService: () => Promise<void>;
// }

// /////////////////////////////////////////////////////////////////////////////////

// // Create the context
// const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

// // Create the provider
// export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({
//   children,
// }) => {
//   const [serviceId, setServiceId] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [ready, setReady] = useState(false);

//   useEffect(() => {
//     let active = true;

//     const run = async (user: any) => {
//       console.log("SERVICE CONTEXT: run called, uid =", user?.uid);

//       if (!user?.uid) {
//         setServiceId(null);
//         setReady(false);
//         setLoading(false);
//         return;
//       }

//       setLoading(true);
//       setReady(false);

//       try {
//         const servicesRef = collection(
//           FIREBASE_FIRESTORE,
//           "Users",
//           user.uid,
//           "Services",
//         );

//         console.log("SERVICE CONTEXT: calling getDocs");

//         const snapshot = await getDocs(servicesRef);

//         console.log(
//           "SERVICE CONTEXT: getDocs finished, services =",
//           snapshot.docs.map((doc) => doc.id),
//         );

//         if (!active) return;

//         if (snapshot.empty) {
//           setServiceId(null);
//           setReady(false);
//           setLoading(false);
//           return;
//         }

//         console.log(
//           "SERVICE CONTEXT: setting serviceId =",
//           snapshot.docs[0].id,
//         );

//         setServiceId(snapshot.docs[0].id);
//         setReady(true);
//         setLoading(false);
//       } catch (err) {
//         console.log("SERVICE CONTEXT: getDocs failed =", err);

//         if (!active) return;

//         logError("ServiceContext/load", err);
//         setServiceId(null);
//         setReady(false);
//         setLoading(false);
//       }
//     };

//     const unsub = onAuthStateChanged(FIREBASE_AUTH, (user) => {
//       run(user);
//     });

//     return () => {
//       active = false;
//       unsub();
//     };
//   }, []);

//   const reloadService = async () => {
//     const user = FIREBASE_AUTH.currentUser;

//     if (!user?.uid) {
//       setServiceId(null);
//       setReady(false);
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     setReady(false);

//     try {
//       const servicesRef = collection(
//         FIREBASE_FIRESTORE,
//         "Users",
//         user.uid,
//         "Services",
//       );

//       console.log("SERVICE CONTEXT: reloadService calling getDocs");

//       const snapshot = await getDocsFromServer(servicesRef);

//       console.log(
//         "SERVICE CONTEXT: reloadService finished, services =",
//         snapshot.docs.map((doc) => doc.id),
//       );

//       if (snapshot.empty) {
//         setServiceId(null);
//         setReady(false);
//         setLoading(false);
//         return;
//       }

//       console.log(
//         "SERVICE CONTEXT: reloadService setting serviceId =",
//         snapshot.docs[0].id,
//       );

//       setServiceId(snapshot.docs[0].id);
//       setReady(true);
//       setLoading(false);
//     } catch (err) {
//       console.log("SERVICE CONTEXT: reloadService failed =", err);

//       logError("ServiceContext/reloadService", err);
//       setServiceId(null);
//       setReady(false);
//       setLoading(false);
//     }
//   };

//   return (
//     <ServiceContext.Provider
//       value={{ serviceId, loading, ready, reloadService }}
//     >
//       {children}
//     </ServiceContext.Provider>
//   );
// };

// export const useService = () => {
//   const context = useContext(ServiceContext);

//   if (!context) {
//     throw new Error("useService must be used within ServiceProvider");
//   }

//   return context;
// };

//////////////////////////////ServiceContext.tsx////////////////////////////////////

// This file contains the ServiceProvider component and the useService hook

////////////////////////////////////////////////////////////////////////////////////

import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, getDocs, getDocsFromServer } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../../firebaseConfig";
import { logError } from "../../lib/loggerClient";

/////////////////////////////////////////////////////////////////////////////////

interface ServiceContextType {
  serviceId: string | null;
  loading: boolean;
  ready: boolean;
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
        const snapshot = await getDocsFromServer(servicesRef);
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

  return (
    <ServiceContext.Provider value={{ serviceId, loading, ready }}>
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
