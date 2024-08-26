/////////////////////////////CustomMenuBTN Component////////////////////////////////////

import React from "react";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { MaterialIcons } from "@expo/vector-icons";
import { DrawerNavigationProp } from "@react-navigation/drawer";

////////////////////////////////////////////////////////////////////////////////////////

type RootStackParamList = {
  //................
};

type CustomMenuBTNProps = {
  //............
};

////////////////////////////////////////////////////////////////////////////////////////

const CustomMenuBTN: React.FC<CustomMenuBTNProps> = () => {
  // initialize navigation
  const navigation = useNavigation<DrawerNavigationProp<RootStackParamList>>();

  // function to open drawer
  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer);
  };

  return (
    <TouchableOpacity onPress={openDrawer}>
      <MaterialIcons
        name="menu-open"
        size={42}
        color="white"
        style={{ marginLeft: 10 }}
      />
    </TouchableOpacity>
  );
};

export default CustomMenuBTN;
