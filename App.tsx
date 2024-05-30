/////////////////////app navigator and stack navigator///////////////////////

import { Text, TouchableOpacity, View } from "react-native";
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar, StatusBarStyle } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import {
  createDrawerNavigator,
  DrawerNavigationProp,
} from "@react-navigation/drawer";
import {
  createStackNavigator,
  TransitionPresets,
} from "@react-navigation/stack";
import {
  Fontisto,
  MaterialIcons,
  MaterialCommunityIcons,
  AntDesign,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { User, onAuthStateChanged } from "firebase/auth";
import LoginScreen from "./Screens/LoginScreen";
import HomeScreen from "./Screens/HomeScreen";
import DetailsScreen from "./Screens/DetailsScreen";
import FlexAccountScreen from "./Screens/FlexAccountScreen";
import VacationScreen from "./Screens/VacationScreen";
import { FIREBASE_AUTH } from "./firebaseConfig";
import CustomDrawer from "./components/CustomDrawer";
import { AlertNotificationRoot } from "react-native-alert-notification";
import { Color } from "react-native-alert-notification/lib/typescript/service";
import { useNavigation } from "@react-navigation/native";
import {
  BottomSheetModalProvider,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import FAQBottomSheet from "./components/FAQBottomSheet";
import CustomMenuBTN from "./components/CustomMenuBTN";
import HelpMenu from "./components/HelpMenu";

////////////////////////////////////////////////////////////////////////

interface CustomDrawerLabelProps {
  focused: boolean;
  title: string;
}

////////////////////////////////////////////////////////////////////////

// create stack and drawer
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const MyHeaderComponent = ({ navigation }: { navigation: any }) => {
  const [isHelpMenuVisible, setHelpMenuVisible] = useState(false);

  const openDropdown = () => {
    console.log("open dropdown help menu");
    setHelpMenuVisible(true);
  };

  const closeDropdown = () => {
    console.log("close dropdown help menu");
    setHelpMenuVisible(false);
  };

  return (
    <TouchableOpacity onPress={openDropdown} style={{ marginRight: 10 }}>
      <MaterialIcons name="live-help" size={36} color="white" />
      {isHelpMenuVisible && (
        <View style={{ position: "absolute", right: 0 }}>
          <HelpMenu onClose={closeDropdown} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const AppDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        drawerStyle: {
          backgroundColor: "black",
          width: 280,
        },

        /*--Help-Button--*/
        headerRight: () => <MyHeaderComponent navigation={undefined} />,
        headerLeft: () => <CustomMenuBTN />,
        headerStyle: {
          backgroundColor: "black",
        },
        headerTintColor: "black",
        headerTitleStyle: {
          bottom: 15,
          fontSize: 42,
          fontFamily: "MPLUSLatin_Bold",
        },
        headerTitleAlign: "center",
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen as any}
        options={{
          drawerLabel: ({ focused }) => (
            <CustomDrawerLabel focused={focused} title="Home" />
          ),
          drawerActiveTintColor: "white",
          drawerInactiveTintColor: "darkgrey",
          drawerIcon: ({ color }) => (
            <AntDesign name="home" size={26} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Flex"
        component={FlexAccountScreen}
        options={{
          drawerActiveTintColor: "white",
          drawerInactiveTintColor: "darkgrey",

          drawerLabel: ({ focused }) => (
            <CustomDrawerLabel focused={focused} title="Flex" />
          ),
          drawerIcon: ({ focused, color }) => (
            <MaterialCommunityIcons
              name="clock-edit-outline"
              size={24}
              color={focused ? "white" : "darkgrey"}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Vacation"
        component={VacationScreen}
        options={{
          drawerLabel: ({ focused }) => (
            <CustomDrawerLabel focused={focused} title="Vacation" />
          ),
          drawerActiveTintColor: "white",
          drawerInactiveTintColor: "darkgrey",
          drawerIcon: ({ focused, color }) => (
            <Fontisto
              name="island"
              size={24}
              color={focused ? "white" : "darkgrey"}
            />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

const CustomDrawerLabel: React.FC<CustomDrawerLabelProps> = ({
  focused,
  title,
}) => (
  <Text
    style={{
      fontFamily: focused ? "MPLUSLatin_Bold" : "MPLUSLatin_Regular",
      fontSize: focused ? 24 : 22,
      color: focused ? "white" : "darkgrey",
    }}
  >
    {title}
  </Text>
);

// drawer navigation for the app
const App = () => {
  // statusbar content color
  const statusBarStyle: StatusBarStyle = "light-content";

  setTimeout(() => {
    StatusBar.setBarStyle("light-content");
  }, 1000);

  // function for googe-fonts implemantation
  const [fontsLoaded] = useFonts({
    MPLUSLatin_Regular: require("./assets/fonts/MPLUSCodeLatin-Regular.ttf"),
    MPLUSLatin_ExtraLight: require("./assets/fonts/MPLUSCodeLatin-ExtraLight.ttf"),
    MPLUSLatin_Bold: require("./assets/fonts/MPLUSCodeLatin-Bold.ttf"),
  });

  // state to navigate user between drawers
  const [user, setUser] = useState<User | null>(null);

  // useeffect to navigate use after login to an other screen
  useEffect(() => {
    onAuthStateChanged(FIREBASE_AUTH, (user) => {
      console.log("user", user);
      setUser(user);
    });
  }, []);

  return (
    <SafeAreaProvider>
      {/*<GestureHandlerRootView style={{ flex: 1 }}> important to set the bottomsheetmodal in the app, not the drawer */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <NavigationContainer>
            {fontsLoaded && (
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                  //This part is used to slide the stack from the right into the screen
                  gestureEnabled: true,
                  gestureDirection: "horizontal",
                  transitionSpec: {
                    open: { animation: "timing", config: { duration: 300 } },
                    close: { animation: "timing", config: { duration: 300 } },
                  },
                  cardStyleInterpolator: ({ current, next, layouts }) => {
                    return {
                      cardStyle: {
                        transform: [
                          {
                            translateX: current.progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [layouts.screen.width, 0],
                            }),
                          },
                        ],
                      },
                    };
                  },
                }}
              >
                {user ? (
                  <Stack.Screen
                    name="Inside"
                    component={AppDrawerNavigator}
                    options={{ headerShown: false }}
                  />
                ) : (
                  <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ headerShown: false }}
                  />
                )}
                {/* Details Screen direkt im Stack Navigator */}
                <Stack.Screen
                  name="Details"
                  component={DetailsScreen as never}
                  options={{
                    headerShown: true,
                    presentation: "modal",
                    animationTypeForReplace: "push",
                    title: "Details",
                  }}
                />
              </Stack.Navigator>
            )}
          </NavigationContainer>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

export default App;
