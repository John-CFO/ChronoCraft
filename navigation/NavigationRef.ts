/////////////////////////////////NavigationRef.ts///////////////////////////////

// THis file is used to create a navigation reference to navigate between screens

////////////////////////////////////////////////////////////////////////////////

import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./RootStackParams";

///////////////////////////////////////////////////////////////////////////////

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<T extends keyof RootStackParamList>(
  name: T,
  params: RootStackParamList[T] extends undefined
    ? undefined
    : RootStackParamList[T],
) {
  if (!navigationRef.isReady()) return;

  if (params) {
    navigationRef.navigate(name as any, params as any);
  } else {
    navigationRef.navigate(name as any);
  }
}
