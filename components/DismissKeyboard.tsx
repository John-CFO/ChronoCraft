///////////////////////////////// DismissKeyboard Component///////////////////

// This component is used to dismiss the keyboard when the user taps outside the keyboard

//////////////////////////////////////////////////////////////////////////////

import {
  Keyboard,
  View,
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
      <View style={[styles.container, style]}>{children}</View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default DismissKeyboard;
