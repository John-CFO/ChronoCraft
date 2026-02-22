/////////////////////app navigator and stack navigator///////////////////////

// This file is used to create the app navigator and the stack navigator
// It includes the whole app three(stack navigator, drawer navigator and app navigator)
// Also it inclues the dropdown menu for the help button nad the global provider for the Copilot guided tour

/////////////////////////////////////////////////////////////////////////////

import { Text, TouchableOpacity } from "react-native";
import React, { useEffect, useContext } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import {
  Fontisto,
  MaterialCommunityIcons,
  AntDesign,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-gesture-handler";
import "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import "text-encoding-polyfill"; //bugfix: for delete project with notes
import { CopilotProvider } from "react-native-copilot";
import { AccessibilityInfo } from "react-native";

import MfaScreen from "./Screens/MfaScreen";
import LoginScreen from "./Screens/LoginScreen";
import HomeScreen from "./Screens/HomeScreen";
import DetailsScreen from "./Screens/DetailsScreen";
import WorkHoursScreen from "./Screens/WorkHoursScreen";
import VacationScreen from "./Screens/VacationScreen";
import CustomDrawer from "./components/CustomDrawer";
import CustomMenuBTN from "./components/CustomMenuBTN";
import HeaderHelpComponent from "./components/HeaderHelpComp";
import { useStore } from "./components/TimeTrackingState";
import CustomAlert from "./components/services/customAlert/CustomAlert";
import { useAlertStore } from "./components/services/customAlert/alertStore";
import { NotificationManager } from "./components/services/PushNotifications";
import { useAccessibilityStore } from "./components/services/accessibility/accessibilityStore";
import { AuthProvider } from "./components/contexts/AuthContext";
import { ServiceProvider } from "./components/contexts/ServiceContext";
import { navigationRef } from "./navigation/NavigationRef";
import { AuthContext } from "./components/contexts/AuthContext";

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

// function to create the app drawer navigator
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
          // hamburger menu button (to open the drawer)
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
            drawerIcon: ({ focused }) => (
              <AntDesign
                name="home"
                size={26}
                color={focused ? "white" : "darkgrey"}
                accessibilityLabel="Home"
                accessibilityRole="image"
                accessibilityState={{ selected: focused }}
              />
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
            drawerIcon: ({ focused }) => (
              <MaterialCommunityIcons
                name="clock-edit-outline"
                size={24}
                color={focused ? "white" : "darkgrey"}
                accessibilityLabel="Work Hours"
                accessibilityRole="image"
                accessibilityState={{ selected: focused }}
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
                accessibilityLabel="Vacation"
                accessibilityRole="image"
                accessibilityState={{ selected: focused }}
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

// AppNavigator - reads Context for Routing
const AppNavigator = () => {
  const { stage, isTwoFAEnabled } = useContext(AuthContext);

  useEffect(() => {
    if (!navigationRef.isReady()) return;

    switch (stage) {
      case "authenticated":
        navigationRef.reset({
          index: 0,
          routes: [
            {
              name: "Inside",
              state: { index: 0, routes: [{ name: "Home" }] },
            },
          ],
        });
        break;

      case "pendingMfa":
        if (isTwoFAEnabled) {
          navigationRef.reset({
            index: 0,
            routes: [{ name: "MfaScreen" }],
          });
        }
        break;

      default:
        navigationRef.reset({ index: 0, routes: [{ name: "Login" }] });
    }
  }, [stage, isTwoFAEnabled]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: false,
        gestureEnabled: true,
        gestureDirection: "horizontal",
        transitionSpec: {
          open: { animation: "timing", config: { duration: 300 } },
          close: { animation: "timing", config: { duration: 300 } },
        },
        cardStyleInterpolator: ({ current, layouts }) => ({
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
        }),
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen as any} />
      <Stack.Screen name="MfaScreen" component={MfaScreen as any} />
      <Stack.Screen name="Inside" component={AppDrawerNavigator} />

      {/* Details Screen bleibt unverändert */}
      <Stack.Screen
        name="Details"
        component={DetailsScreen as any}
        initialParams={{ projectId: "" }}
        options={({ navigation }) => ({
          headerShown: true,
          presentation: "modal",
          animationTypeForReplace: "push",
          headerRight: () => <HeaderHelpComponent navigation={navigation} />,
          headerLeft: () => (
            <TouchableOpacity
              onPress={async () => {
                const projectId = useStore.getState().getProjectId();
                const isTracking = await useStore
                  .getState()
                  .getProjectTrackingState(projectId);

                if (isTracking) {
                  useAlertStore
                    .getState()
                    .showAlert(
                      "Project is still running.",
                      " You can't leave the app. Please stop the project first.",
                    );
                } else {
                  navigation.goBack();
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Back"
              accessibilityHint="Button to go back to the previous screen"
              accessibilityState={{ expanded: true }}
              style={{ marginLeft: 20 }}
            >
              <AntDesign name="doubleleft" size={28} color="white" />
            </TouchableOpacity>
          ),
          headerStyle: { backgroundColor: "black" },
          headerTintColor: "black",
          headerTitleStyle: { fontSize: 24 },
        })}
      />
    </Stack.Navigator>
  );
};

// App - provites all providers
const App = () => {
  // statusbar content color
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      StatusBar.setBarStyle("light-content");
    }, 100); // delay in ms

    return () => clearTimeout(timeoutId); // prevent memory leak
  }, []); // only run once

  // hide splashscreen
  useEffect(() => {
    const hide = async () => {
      await SplashScreen.hideAsync();
    };
    hide();
  }, []);

  // state to check if screen reader is enabled
  const setAccessibility = useAccessibilityStore(
    (state) => state.setAccessibility,
  );
  // hook to check if screen reader is enabled
  useEffect(() => {
    // initial check
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      setAccessibility(enabled);
    });

    // subscribe to changes if user enables screen reader with the AccessiblityToggleButton
    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (enabled) => {
        setAccessibility(enabled);
      },
    );

    // cleanup
    return () => {
      subscription.remove();
    };
  }, []);

  // function for googe-fonts implemantation
  const [fontsLoaded] = useFonts({
    MPLUSLatin_Regular: require("./assets/fonts/MPLUSCodeLatin-Regular.ttf"),
    MPLUSLatin_ExtraLight: require("./assets/fonts/MPLUSCodeLatin-ExtraLight.ttf"),
    MPLUSLatin_Bold: require("./assets/fonts/MPLUSCodeLatin-Bold.ttf"),
  });

  // hook to handle the notification initialization
  useEffect(() => {
    NotificationManager.configureNotificationHandler();
  }, []);

  return (
    <AuthProvider>
      <ServiceProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheetModalProvider>
              <NavigationContainer
                ref={navigationRef}
                onReady={() => console.log("Navigation ready")}
              >
                <CustomAlert />
                {fontsLoaded && <AppNavigator />}
              </NavigationContainer>
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ServiceProvider>
    </AuthProvider>
  );
};

export default App;
