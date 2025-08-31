///////////////////AuthContext.tsx////////////////////

// This file is used to create the auth context to use it inside the LoginScreen and App.tsx

//////////////////////////////////////////////////////

import React from "react";
import type { User } from "firebase/auth";

//////////////////////////////////////////////////////

export type AuthContextType = {
  setUser: (u: User | null) => void;
};

export const AuthContext = React.createContext<AuthContextType>({
  setUser: () => {},
});
