//////////////////////////AnimatedText Component////////////////////

// In this component would be rendered the typed text animation wich is visible in the LoginScreen.
// The animation shows 3 relevant properties from the application.

// You find a detailed documentation on https://github.com/benjamineruvieru/react-native-type-animation.
// In this documentaiton would you find properties to change style, loop and handle the type-animation library.

////////////////////////////////////////////////////////////////////

import React from "react";
import { TypeAnimation } from "react-native-type-animation";

////////////////////////////////////////////////////////////////////

const AnimatedText = () => {
  return (
    <TypeAnimation
      sequence={[
        { text: "Timetracking" },
        { text: "Efficiency" },
        { text: "Analytics" },
      ]}
      loop
      style={{
        color: "white",
        fontWeight: "bold",

        fontSize: 22,
      }}
      cursorStyle={{ color: "aqua" }}
    />
  );
};

export default AnimatedText;
