///////////////////AuthContext.tsx////////////////////

// This file is used to create the auth context to use it inside the LoginScreen and App.tsx

//////////////////////////////////////////////////////

import React, { useState } from "react";
import type { User } from "firebase/auth";

//////////////////////////////////////////////////////

// AuthStage: loggedOut → pendingMfa → authenticated
export type AuthStage = "loggedOut" | "pendingMfa" | "authenticated";

// type for the auth context
export type AuthContextType = {
  user: User | null;
  stage: AuthStage;
  setUser: (u: User | null) => void;
  setStage: (stage: AuthStage) => void;
  isTwoFAEnabled: boolean;
  setTwoFAEnabled: (enabled: boolean) => void;
};

// function to create the auth context
export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  stage: "loggedOut",
  setUser: () => {},
  setStage: () => {},
  isTwoFAEnabled: false,
  setTwoFAEnabled: () => {},
});

// function to create the auth provider
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [stage, setStage] = useState<AuthStage>("loggedOut");
  const [isTwoFAEnabled, setTwoFAEnabled] = useState<boolean>(false);

  // return the auth context and the children
  return (
    <AuthContext.Provider
      value={{
        user,
        stage,
        setUser,
        setStage,
        isTwoFAEnabled,
        setTwoFAEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
