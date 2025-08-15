/////////////////////////HeaderHelpComponent.tsx//////////////////////////

// This component is used to create the menu button for the help menu inside the header

/////////////////////////////////////////////////////////////////////////

import React, { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import HelpMenu from "./HelpMenu";

/////////////////////////////////////////////////////////////////////////

const HeaderHelpComponent = ({ navigation }: { navigation: any }) => {
  // initial state
  const [isHelpMenuVisible, setHelpMenuVisible] = useState(false);
  // function to open or close the help menu
  const openDropdown = () => setHelpMenuVisible(true);
  const closeDropdown = () => setHelpMenuVisible(false);

  return (
    <View>
      <TouchableOpacity
        onPress={openDropdown}
        accessibilityRole="button"
        accessibilityLabel="Help Menu"
        accessibilityHint="Opens the help menu to inform us about any issues or bugs"
        accessibilityState={{ expanded: isHelpMenuVisible }}
        style={{ marginRight: 10 }}
      >
        <MaterialIcons name="live-help" size={36} color="white" />
      </TouchableOpacity>

      {isHelpMenuVisible && <HelpMenu onClose={closeDropdown} />}
    </View>
  );
};

export default HeaderHelpComponent;
