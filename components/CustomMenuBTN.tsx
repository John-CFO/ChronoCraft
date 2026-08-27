/////////////////////////////CustomMenuBTN Component////////////////////////////////////

// THis component creates a custom menu button to open the drawer

////////////////////////////////////////////////////////////////////////////////////////

import React from "react";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { MaterialIcons } from "@expo/vector-icons";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useTranslation } from "react-i18next";

////////////////////////////////////////////////////////////////////////////////////////

type RootStackParamList = {
  //................
};

type CustomMenuBTNProps = {
  //............
};

////////////////////////////////////////////////////////////////////////////////////////

const CustomMenuBTN: React.FC<CustomMenuBTNProps> = () => {
  // useTranslation hook to access translations
  const { t } = useTranslation();

  // initialize navigation
  const navigation = useNavigation<DrawerNavigationProp<RootStackParamList>>();

  // function to open drawer
  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer);
  };

  return (
    <TouchableOpacity
      onPress={openDrawer}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={t("drawer.menuButton")}
      accessibilityHint={t("drawer.menuButtonHint")}
    >
      <MaterialIcons
        accessibilityElementsHidden
        name="menu-open"
        size={42}
        color="white"
        style={{ marginLeft: 10 }}
      />
    </TouchableOpacity>
  );
};

export default CustomMenuBTN;
