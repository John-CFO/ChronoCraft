///////////////////////////////// DismissKeyboard Component///////////////////

// This component is used to dismiss the keyboard when the user taps outside the keyboard

//////////////////////////////////////////////////////////////////////////////

import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import React, { ReactNode } from "react";

////////////////////////////////////////////////////////////////////////////////

type Props = {
  children: ReactNode;
  style?: any;
};

////////////////////////////////////////////////////////////////////////////////

const DismissKeyboard = ({ children, style }: Props) => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.container, style]}
      >
        {children}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default DismissKeyboard;
