///////////////////////////login screen with firebase registry/////////////////////////////////

// This screen shows the login screen with firebase registry.
// The authentication is handled by firebase auth.
// The user can login with email and password or registry with email and password.
// It includes also accessibility features to make the app more accessible for users with disabilities.

///////////////////////////////////////////////////////////////////////////////////////////////

import {
  View,
  Dimensions,
  StatusBar,
  ImageBackground,
  StyleSheet,
  Image,
} from "react-native";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  Auth,
} from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import {
  ALERT_TYPE,
  Toast,
  AlertNotificationRoot,
} from "react-native-alert-notification";
import { NotificationManager } from "../components/services/PushNotifications";
import { validate } from "react-email-validator";
import { BlurView } from "expo-blur";

import { FIREBASE_APP, FIREBASE_FIRESTORE } from "../firebaseConfig";
import { RootStackParamList } from "../navigation/RootStackParams";
import AppLogo from "../components/AppLogo";
import AnimatedText from "../components/AnimatedText";
import DismissKeyboard from "../components/DismissKeyboard";
import { useAlertStore } from "../components/services/customAlert/alertStore";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import AuthForm from "../components/AuthForm";

//////////////////////////////////////////////////////////////////////////////////////////////

type RegisterScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Home"
>;

////////////////////////////////////////////////////////////////////////////////////////////

const LoginScreen: React.FC = () => {
  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // declaire the navigation to user get in after logein
  const navigation = useNavigation<RegisterScreenNavigationProp>();

  // states for registry and login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // const [secureTextEntry, setSecureTextEntry] = useState(true);

  // state to handle the loading animation
  const [loading, setLoading] = useState<boolean>(false);

  // declaire the firebase authentication
  const auth: Auth = getAuth(FIREBASE_APP);

  // function to validate the inputs
  const validateInputs = () => {
    if (!validate(email)) {
      useAlertStore
        .getState()
        .showAlert("Unvalid E-Mail", "Plese enter a validate E-Mail.");
      return false;
    }
    if (password.length < 8) {
      useAlertStore
        .getState()
        .showAlert(
          "Weak Password",
          "The password must be at least 8 characters long."
        );
      return false;
    }

    const specialChars = password.match(/[-_!@#$%^&*(),.?":{}|<>]/g);
    if (!specialChars || specialChars.length < 2) {
      useAlertStore
        .getState()
        .showAlert(
          "Special characters missing",
          "The password must contain at least 2 special characters."
        );
      return false;
    }
    return true;
  };

  // function to handle the login process
  const handleLogin = async () => {
    if (!validateInputs()) return;
    setLoading(true);
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      console.log(response);

      const userRef = doc(FIREBASE_FIRESTORE, "Users", response.user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        // condition to check if firstLogin is true
        if (userData.firstLogin) {
          console.log("First-time login detected");
          // set firstLogin to false
          await setDoc(userRef, { firstLogin: false }, { merge: true });
        }
      }

      navigation.navigate("Home" as never);
      console.log("Login successfully");
    } catch (error) {
      console.log("Login failed:", error);

      // react-native-alert-notification toast
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: "Login failed",
        textBody: "Something went wrong, please try again!",
      });
    } finally {
      setLoading(false);
    }
  };

  // funcion to handle the registry process
  const handleRegister = async () => {
    if (!validateInputs()) return;
    setLoading(true);
    try {
      const response = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("Registration successfully:", response);

      await createUserDocument(response.user.uid, {
        email: email,
        firstLogin: true,
      });

      await setDoc(doc(FIREBASE_FIRESTORE, "Users", response.user.uid), {
        hasSeenHomeTour: false,
        hasSeenDetailsTour: false,
        hasSeenVacationTour: false,
        hasSeenWorkHoursTour: false,
        firstLogin: true,
      });

      // call the push token
      const token = await NotificationManager.registerForPushNotifications();
      if (!token) {
        console.log("Push token not available.");
        return;
      }

      // console.log("Expo Push Token:", token);

      // save the push token to the firestore
      await NotificationManager.savePushTokenToDatabase(
        response.user.uid,
        token
      );

      // welcome notification
      await NotificationManager.sendWelcomeNotification(token);
      // navigate to the home screen with the flag
      navigation.navigate("Home", { fromRegister: true });
    } catch (error) {
      console.log("Registration failed:", error);
      // alert notification toast
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: "Registration failed",
        textBody: "Choose email and password and then click Register!",
      });
    } finally {
      setLoading(false);
    }
  };

  // function to create user document in firestore
  const createUserDocument = async (userId: string, userData: any) => {
    try {
      const userRef = doc(FIREBASE_FIRESTORE, "Users", userId);
      await setDoc(userRef, userData, { merge: true });
      // console.log("User document created successfully");
    } catch (error) {
      console.error("Error creating user document:", error);
    }
  };

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );
  // console.log("accessMode in LoginScreen:", accessMode);

  return (
    <AlertNotificationRoot>
      <DismissKeyboard>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "#191919",
          }}
        >
          {accessMode ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* Status bar */}
              <StatusBar
                barStyle="light-content"
                translucent={false}
                backgroundColor="black"
              />

              <Image
                source={require("../assets/time-bg.png")}
                resizeMode="cover"
                style={{
                  flex: 1,
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                }}
              />

              {/* Blur-Overlay */}
              <BlurView
                intensity={20}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />

              <View
                style={{
                  paddingBottom: 420,
                  position: "absolute",
                  width: screenWidth * 0.9, // use 90% of the screen width
                  maxWidth: 320,
                }}
              >
                {/* App logo */}
                <AppLogo />
                <View
                  style={{
                    bottom: 10,
                    justifyContent: "flex-start",
                    alignItems: "center",
                    zIndex: 3,
                    width: "auto",
                    height: 30,
                  }}
                >
                  {/* Text animation */}
                  <AnimatedText />
                </View>
              </View>
              <View
                style={{
                  marginTop: 220,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {/* AuthForm component */}
                <AuthForm
                  email={email}
                  password={password}
                  setEmail={setEmail}
                  setPassword={setPassword}
                  handleLogin={handleLogin}
                  handleRegister={handleRegister}
                />
              </View>
            </View>
          ) : (
            // BackgroundImage
            <ImageBackground
              source={require("../assets/Holo_GIF.gif")}
              style={{
                flex: 1,
                width: "100%",
                height: "100%",
                overflow: "hidden",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  paddingTop: 170,
                  position: "absolute",
                  width: screenWidth * 0.9, // use 90% of the screen width
                  maxWidth: 320,
                }}
              >
                {/* App logo */}
                <AppLogo />
                <View
                  style={{
                    bottom: 10,
                    justifyContent: "flex-start",
                    alignItems: "center",
                    zIndex: 3,
                    width: "auto",
                    height: 30,
                  }}
                >
                  {/* Text animation */}
                  <AnimatedText />
                </View>
                <View
                  style={{
                    marginTop: 120,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {/* AuthForm component */}
                  <AuthForm
                    email={email}
                    password={password}
                    setEmail={setEmail}
                    setPassword={setPassword}
                    handleLogin={handleLogin}
                    handleRegister={handleRegister}
                  />
                </View>
              </View>

              {/* Status bar */}
              <StatusBar
                barStyle="light-content"
                translucent={false}
                backgroundColor={"black"}
              />
            </ImageBackground>
          )}
        </View>
      </DismissKeyboard>
    </AlertNotificationRoot>
  );
};

export default LoginScreen;
