/////////////////////////////////NavigationRef.ts///////////////////////////////

// THis file is used to create a navigation reference to navigate between screens

////////////////////////////////////////////////////////////////////////////////

import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./RootStackParams";

///////////////////////////////////////////////////////////////////////////////

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(name: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
