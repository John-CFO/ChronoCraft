///////////////////////////login screen with firebase registry/////////////////////////////////

// This screen shows the login screen with firebase registry.
// The authentication is handled by firebase auth.
// The user can login with email and password or registry with email and password.

///////////////////////////////////////////////////////////////////////////////////////////////

import {
  View,
  TextInput,
  Text,
  Platform,
  ActivityIndicator,
  StatusBar,
  ImageBackground,
  KeyboardAvoidingView,
  TouchableOpacity,
} from "react-native";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  Auth,
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import {
  ALERT_TYPE,
  Toast,
  AlertNotificationRoot,
} from "react-native-alert-notification";
import { NotificationManager } from "../components/services/PushNotifications";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome5 } from "@expo/vector-icons";

import { FIREBASE_APP, FIREBASE_FIRESTORE } from "../firebaseConfig";
import AppLogo from "../components/AppLogo";
import AnimatedText from "../components/AnimatedText";
import LostPasswordModal from "../components/LostPasswordModal";

//////////////////////////////////////////////////////////////////////////////////////////////

const LoginScreen: React.FC = () => {
  // declaire the navigation to user get in after logein
  const navigation = useNavigation();

  // states for LostPasswordModal
  const [isModalVisible, setModalVisible] = useState(false);

  // function to toggle the LostPasswordModal to open or close
  const toggleModal = () => {
    setModalVisible((prev) => !prev);
  };

  // states for registry and login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [loading, setLoading] = useState<boolean>(false);

  // declaire the firebase authentication
  const auth: Auth = getAuth(FIREBASE_APP);

  // function to handle the login process
  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      console.log(response);

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
    setLoading(true);
    try {
      const response = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("Registration successfully:", response);

      await createUserDocument(response.user.uid, { email: email });

      // call the push token
      const token = await NotificationManager.registerForPushNotifications();
      if (!token) {
        console.log("Push token not available.");
        return;
      }

      console.log("Expo Push Token:", token);

      // save the push token to the firestore
      await NotificationManager.savePushTokenToDatabase(
        response.user.uid,
        token
      );

      // welcome notification
      await NotificationManager.sendWelcomeNotification(token);
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

  // function to handle password visibility
  const toggleSecureTextEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  // function to create user document in firestore
  const createUserDocument = async (userId: string, userData: any) => {
    try {
      const userRef = doc(FIREBASE_FIRESTORE, "Users", userId);
      await setDoc(userRef, userData, { merge: true });
      console.log("User document created successfully");
    } catch (error) {
      console.error("Error creating user document:", error);
    }
  };

  return (
    <AlertNotificationRoot>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          {/* Background image */}
          <ImageBackground
            source={require("../assets/Holo_GIF.gif")}
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                paddingTop: 170,
                position: "absolute",
                width: "100%",
              }}
            >
              {/* App logo */}
              <AppLogo />
              <View
                style={{
                  bottom: 10,
                  marginLeft: 45,
                  justifyContent: "center",
                  zIndex: +3,
                  width: 250,
                  height: 30,
                }}
              >
                {/* Text animation */}
                <AnimatedText />
              </View>
            </View>
            <View
              style={{
                marginTop: 380,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  height: 110,
                  width: 350,
                  justifyContent: "space-around",
                  alignItems: "center",
                }}
              >
                {/* Email input */}
                <TextInput
                  style={{
                    borderColor: "aqua",
                    borderWidth: 1.5,
                    borderRadius: 12,
                    paddingLeft: 15,
                    fontSize: 22,
                    paddingBottom: 5,
                    height: 50,
                    width: 280,
                    color: "white",
                    backgroundColor: "#191919",
                  }}
                  placeholder="Email"
                  placeholderTextColor={"darkgrey"}
                  autoCapitalize="none"
                  onChangeText={(text) => setEmail(text)}
                  value={email}
                />
                <View style={{ position: "relative", width: 280, height: 40 }}>
                  {/* Password input */}
                  <TextInput
                    style={{
                      borderColor: "aqua",
                      borderWidth: 1.5,
                      borderRadius: 12,
                      paddingLeft: 15,
                      paddingRight: 40,
                      paddingBottom: 5,
                      fontSize: 22,
                      height: 50,
                      color: "white",
                      backgroundColor: "#191919",
                    }}
                    placeholder="Password"
                    placeholderTextColor={"darkgrey"}
                    autoCapitalize="none"
                    secureTextEntry={secureTextEntry}
                    onChangeText={(text) => setPassword(text)}
                    value={password}
                  />
                  {/* Visibility eye button */}
                  <TouchableOpacity
                    onPress={toggleSecureTextEntry}
                    style={{ position: "absolute", right: 15, top: 15 }}
                  >
                    <FontAwesome5
                      name={secureTextEntry ? "eye" : "eye-slash"}
                      size={20}
                      color="darkgrey"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "column",
                  margin: 30,
                }}
              >
                {/* Login button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  style={{
                    width: 280,
                    borderRadius: 12,
                    overflow: "hidden",
                    borderWidth: 3,
                    borderColor: "white",
                    marginBottom: 8,
                  }}
                >
                  <LinearGradient
                    colors={["#00FFFF", "#FFFFFF"]}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      height: 45,
                      width: 280,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "MPLUSLatin_Bold",
                        fontSize: 22,
                        color: "grey",
                        marginBottom: 5,
                      }}
                    >
                      Login
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Register button */}
                <TouchableOpacity
                  onPress={handleRegister}
                  style={{
                    width: 280,
                    borderRadius: 12,
                    overflow: "hidden",
                    borderWidth: 3,
                    borderColor: "white",
                  }}
                >
                  <LinearGradient
                    colors={["#00FFFF", "#FFFFFF"]}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      height: 45,
                      width: 280,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "MPLUSLatin_Bold",
                        fontSize: 22,
                        color: "grey",
                        marginBottom: 5,
                      }}
                    >
                      Register
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* LostPasswordModal */}
              <TouchableOpacity onPress={toggleModal} style={{ marginTop: 10 }}>
                <Text
                  style={{
                    color: "aqua",
                    textDecorationLine: "underline",
                    fontSize: 16,
                  }}
                >
                  Forgot Password?
                </Text>
              </TouchableOpacity>
              <LostPasswordModal
                visible={isModalVisible}
                onClose={toggleModal}
              />
            </View>

            {/* Status bar */}
            <StatusBar
              barStyle="light-content"
              translucent
              backgroundColor={"transparent"}
            />
          </ImageBackground>
        </View>
      </KeyboardAvoidingView>
    </AlertNotificationRoot>
  );
};

export default LoginScreen;
