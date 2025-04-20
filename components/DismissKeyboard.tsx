///////////////////////////////// DismissKeyboard Component///////////////////

// This component is used to dismiss the keyboard when the user taps outside the keyboard

//////////////////////////////////////////////////////////////////////////////

import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  ViewStyle,
} from "react-native";
import React, { ReactNode } from "react";

////////////////////////////////////////////////////////////////////////////////

type Props = {
  children: ReactNode;
  containerStyle?: ViewStyle;
  scroll?: boolean;
};

////////////////////////////////////////////////////////////////////////////////

const DismissKeyboard = ({
  children,
  containerStyle,
  scroll = true,
}: Props) => {
  // define the inner component
  const Inner = scroll ? ScrollView : React.Fragment;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Inner
          {...(scroll
            ? { contentContainerStyle: [{ flexGrow: 1 }, containerStyle] }
            : {})}
        >
          {children}
        </Inner>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default DismissKeyboard;
