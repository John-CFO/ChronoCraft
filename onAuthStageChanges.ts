/////////////////////////// onAuthStageChanges.ts ////////////////////////////

// This component listens to Firebase Auth state changes and updates the AuthContext accordingly.
// It also resets the navigation stack to the Login screen when the user logs out.

////////////////////////////////////////////////////////////////////////////////

import { useEffect, useContext } from "react";
import { CommonActions } from "@react-navigation/native";

import { FIREBASE_AUTH } from "./firebaseConfig";
import { AuthContext } from "./components/contexts/AuthContext";
import { navigationRef } from "./navigation/NavigationRef";

/////////////////////////////////////////////////////////////////////////////////

export const AuthStateListener: React.FC = () => {
  const { setUser, setStage } = useContext(AuthContext);

  useEffect(() => {
    const unsub = FIREBASE_AUTH.onAuthStateChanged((user) => {
      setUser(user);

      if (!user) {
        setStage("loggedOut");

        if (navigationRef.isReady()) {
          navigationRef.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Login" }],
            }),
          );
        }
      }
    });

    return () => unsub();
  }, [setUser, setStage]);

  return null;
};
