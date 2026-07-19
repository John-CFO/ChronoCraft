/////////////////////////////AlertStore Component/////////////////////////////////

// This component is used to manage the state of the custom alert

//////////////////////////////////////////////////////////////////////////////////

import { create } from "zustand";

//////////////////////////////////////////////////////////////////////////////////

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: "cancel" | "default" | "destructive";
};

type AlertOptions = {
  cancelable?: boolean;
};

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
  showAlert: (
    title: string,
    message: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
  ) => void;
  hideAlert: () => void;
}

//////////////////////////////////////////////////////////////////////////////////

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  title: "",
  message: "",
  showAlert: (title, message, buttons = [{ text: "OK" }], options) => {
    set({
      visible: true,
      title,
      message,
      buttons,
      options,
    });
  },
  hideAlert: () => {
    set({ visible: false });
  },
}));
