///////////////////////AccessibilityStore Component////////////////////////////

// This component is used to manage the state of the accessibility feature
// If accessibility is enabled, the user can use the keyboard to navigate through the app without using the screen reader

///////////////////////////////////////////////////////////////////////////////

import { create } from "zustand";

///////////////////////////////////////////////////////////////////////////////

type AccessibilityState = {
  accessibilityEnabled: boolean;
  setAccessibility: (enabled: boolean) => void;
  toggleAccessibility: () => void;
};

export const useAccessibilityStore = create<AccessibilityState>((set) => ({
  accessibilityEnabled: false,
  setAccessibility: (enabled) => set({ accessibilityEnabled: enabled }),
  toggleAccessibility: () =>
    set((state) => ({ accessibilityEnabled: !state.accessibilityEnabled })),
}));
