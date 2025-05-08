/////////////////////app navigator and stack navigator///////////////////////

// This file is used to create the app navigator and the stack navigator
// It includes the whole app three(stack navigator, drawer navigator and app navigator)
// Also it inclues the dropdown menu for the help button nad the global provider for the Copilot guided tour

/////////////////////////////////////////////////////////////////////////////

import { Text, TouchableOpacity, View, Alert } from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import {
  Fontisto,
  MaterialIcons,
  MaterialCommunityIcons,
  AntDesign,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { User, onAuthStateChanged } from "firebase/auth";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-gesture-handler";
import "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import "text-encoding-polyfill"; //bugfix: for delete project with notes
import { CopilotProvider } from "react-native-copilot";

import LoginScreen from "./Screens/LoginScreen";
import HomeScreen from "./Screens/HomeScreen";
import DetailsScreen from "./Screens/DetailsScreen";
import WorkHoursScreen from "./Screens/WorkHoursScreen";
import VacationScreen from "./Screens/VacationScreen";
import { FIREBASE_AUTH } from "./firebaseConfig";
import CustomDrawer from "./components/CustomDrawer";
import CustomMenuBTN from "./components/CustomMenuBTN";
import HelpMenu from "./components/HelpMenu";
import { useStore } from "./components/TimeTrackingState";

////////////////////////////////////////////////////////////////////////

// interface for custom drawer label
interface CustomDrawerLabelProps {
  focused: boolean;
  title: string;
}

////////////////////////////////////////////////////////////////////////

// create stack and drawer
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const HeaderHelpComponent = ({ navigation }: { navigation: any }) => {
  const [isHelpMenuVisible, setHelpMenuVisible] = useState(false);

  // function to open help menu
  const openDropdown = () => {
    // console.log("open dropdown help menu");
    setHelpMenuVisible(true);
  };
  // function to close help menu
  const closeDropdown = () => {
    // console.log("close dropdown help menu");
    setHelpMenuVisible(false);
  };

  return (
    <View>
      <TouchableOpacity onPress={openDropdown} style={{ marginRight: 10 }}>
        <MaterialIcons name="live-help" size={36} color="white" />
      </TouchableOpacity>
      {isHelpMenuVisible && (
        <View style={{ position: "absolute", right: 0 }}>
          <HelpMenu onClose={closeDropdown} />
        </View>
      )}
    </View>
  );
};

const AppDrawerNavigator = () => {
  return (
    <CopilotProvider>
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawer {...props} />}
        screenOptions={{
          drawerStyle: {
            backgroundColor: "black",
            width: 280,
          },

          // help button
          headerRight: () => <HeaderHelpComponent navigation={undefined} />,
          // custom hamburger menu
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
          // function to change the icon color when focused
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
          name="WorkHours"
          component={WorkHoursScreen as any}
          options={{
            // function to change the icon color when focused
            drawerActiveTintColor: "white",
            drawerInactiveTintColor: "darkgrey",

            drawerLabel: ({ focused }) => (
              <CustomDrawerLabel focused={focused} title="Work-Hours" />
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
          component={VacationScreen as any}
          options={{
            // function to change the icon color when focused
            drawerLabel: ({ focused }) => (
              <CustomDrawerLabel focused={focused} title="Vacation" />
            ),
            drawerActiveTintColor: "white",
            drawerInactiveTintColor: "darkgrey",
            drawerIcon: ({ focused }) => (
              <Fontisto
                name="island"
                size={24}
                color={focused ? "white" : "darkgrey"}
              />
            ),
          }}
        />
      </Drawer.Navigator>
    </CopilotProvider>
  );
};

// function to change the color of the drawer label based on focus
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

// disable splashscreen
SplashScreen.preventAutoHideAsync();

// drawer navigation for the app
const App = () => {
  // statusbar content color
  setTimeout(() => {
    StatusBar.setBarStyle("light-content");
  }, 1000);

  // hide splashscreen
  useEffect(() => {
    const hide = async () => {
      await SplashScreen.hideAsync();
    };
    hide();
  }, []);

  // function for googe-fonts implemantation
  const [fontsLoaded] = useFonts({
    MPLUSLatin_Regular: require("./assets/fonts/MPLUSCodeLatin-Regular.ttf"),
    MPLUSLatin_ExtraLight: require("./assets/fonts/MPLUSCodeLatin-ExtraLight.ttf"),
    MPLUSLatin_Bold: require("./assets/fonts/MPLUSCodeLatin-Bold.ttf"),
  });

  // state to navigate user between drawers
  const [user, setUser] = useState<User | null>(null);

  // hook to navigate use after login to an other screen
  useEffect(() => {
    onAuthStateChanged(FIREBASE_AUTH, (user) => {
      // console.log("user", user);
      setUser(user);
    });
  }, []);

  return (
    <SafeAreaProvider>
      {/* <GestureHandlerRootView style={{ flex: 1 }}> //important to set the bottomsheetmodal in the app, not the drawer */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          {/* navigation container */}
          <NavigationContainer>
            {fontsLoaded && (
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                  animationEnabled: false, // importent to disable the default animation wich produces a header jump bug
                  // This part is used to slide the stack from the right into the screen
                  gestureEnabled: true,
                  gestureDirection: "horizontal",
                  transitionSpec: {
                    open: {
                      animation: "timing",
                      config: { duration: 300 },
                    },
                    close: {
                      animation: "timing",
                      config: { duration: 300 },
                    },
                  },
                  // function to slide the stack from the right into the screen
                  cardStyleInterpolator: ({ current, layouts }) => {
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
                {/* Login navigation when user is logged in or logged out */}
                {user ? (
                  // Inside Screen with drawer navigation
                  <Stack.Screen
                    name="Inside"
                    component={AppDrawerNavigator}
                    options={{ headerShown: false }}
                  />
                ) : (
                  // Login Screen
                  <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ headerShown: false }}
                  />
                )}

                {/* Details Screen */}
                <Stack.Screen
                  name="Details"
                  component={DetailsScreen as any}
                  initialParams={{
                    projectId: "",
                  }}
                  // custom header config. for Details Screen
                  options={({ navigation }) => ({
                    headerShown: true,
                    presentation: "modal", //card test
                    animationTypeForReplace: "push",
                    headerRight: () => (
                      <HeaderHelpComponent navigation={navigation} />
                    ),
                    // Back button includes the if statement to check if the project is still running
                    headerLeft: () => (
                      <TouchableOpacity
                        onPress={async () => {
                          const projectId = useStore.getState().getProjectId();
                          const isTracking = await useStore
                            .getState()
                            .getProjectTrackingState(projectId);

                          if (isTracking) {
                            Alert.alert(
                              "Project is still running.",
                              " You can't leave the app. Please stop the project first."
                            );
                          } else {
                            navigation.goBack();
                          }
                        }}
                        style={{ marginLeft: 20 }}
                      >
                        <AntDesign name="doubleleft" size={28} color="white" />
                      </TouchableOpacity>
                    ),
                    headerStyle: {
                      backgroundColor: "black",
                    },
                    headerTintColor: "black",
                    headerTitleStyle: {
                      fontSize: 24,
                    },
                  })}
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
