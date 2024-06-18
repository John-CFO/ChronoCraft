///////////////////////////login screen with firebase registry/////////////////////////////////

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
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome5 } from "@expo/vector-icons";

import { FIREBASE_APP, FIREBASE_FIRESTORE } from "../firebaseConfig";
import AppLogo from "../components/AppLogo";
import AnimatedText from "../components/AnimatedText";
import { showNotification } from "../components/services/PushNotifications";

//////////////////////////////////////////////////////////////////////////////////////////////

const LoginScreen: React.FC = () => {
  // declaire the navigation to user get in after logein
  const navigation = useNavigation();

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

      // Welcome notification from expo-push-notifications
      await showNotification(
        "Welcome! 🎉 ",
        "Congratulations. Registration successful!"
      );

      console.log("Success message should be visible now");
    } catch (error) {
      console.log("Registration failed:", error);

      // react-native-alert-notification toast
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: "Registration failed",
        textBody: "choose email and password and then click Register!",
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
      const userRef = doc(FIREBASE_FIRESTORE, "users", userId);
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
          {/* background image */}
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
              {/* app logo */}
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
                {/* text animation */}
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
                {/* email input */}
                <TextInput
                  style={{
                    borderColor: "black",
                    borderWidth: 2,
                    borderRadius: 10,
                    paddingLeft: 15,
                    padding: 5,
                    fontSize: 22,
                    height: 40,
                    width: 270,
                    backgroundColor: "white",
                    fontFamily: "MPLUSLatin_Regular",
                  }}
                  placeholder="Email"
                  autoCapitalize="none"
                  onChangeText={(text) => setEmail(text)}
                  value={email}
                />
                <View style={{ position: "relative", width: 270, height: 40 }}>
                  {/* password input */}
                  <TextInput
                    style={{
                      borderColor: "black",
                      borderWidth: 2,
                      borderRadius: 10,
                      paddingLeft: 15,
                      paddingRight: 40,
                      padding: 5,
                      fontSize: 22,
                      height: "100%",
                      backgroundColor: "white",
                      fontFamily: "MPLUSLatin_Regular",
                    }}
                    placeholder="Password"
                    autoCapitalize="none"
                    secureTextEntry={secureTextEntry}
                    onChangeText={(text) => setPassword(text)}
                    value={password}
                  />
                  {/* visibility eye button */}
                  <TouchableOpacity
                    onPress={toggleSecureTextEntry}
                    style={{ position: "absolute", right: 15, top: 10 }}
                  >
                    <FontAwesome5
                      name={secureTextEntry ? "eye" : "eye-slash"}
                      size={20}
                      color="darkgrey"
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {/* loading spinner */}
              {loading ? (
                <ActivityIndicator
                  size="large"
                  color="blue"
                ></ActivityIndicator>
              ) : (
                <>
                  <View style={{ flexDirection: "row", margin: 20 }}>
                    {/* login button */}
                    <TouchableOpacity
                      onPress={handleLogin}
                      style={{
                        marginHorizontal: 10,
                        width: 120,
                        height: 55,
                        borderRadius: 10,
                        borderWidth: 3,
                        borderColor: "white",
                        overflow: "hidden",
                      }}
                    >
                      <LinearGradient
                        colors={["#00FFFF", "#FFFFFF"]}
                        style={{
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 6,
                          height: 55,
                          width: 120,
                        }}
                      >
                        <Text
                          style={{
                            marginBottom: 20,
                            marginRight: 10,
                            color: "grey",
                            fontSize: 25,
                            fontFamily: "MPLUSLatin_Bold",
                          }}
                        >
                          Login
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* register button */}
                    <TouchableOpacity
                      onPress={handleRegister}
                      style={{
                        marginHorizontal: 10,
                        width: 120,
                        height: 55,
                        borderRadius: 10,
                        borderWidth: 3,
                        borderColor: "white",
                        overflow: "hidden",
                      }}
                    >
                      <LinearGradient
                        colors={["#00FFFF", "#FFFFFF"]}
                        style={{
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 6,
                          height: 55,
                          width: 120,
                        }}
                      >
                        <Text
                          style={{
                            marginBottom: 20,
                            marginRight: 10,
                            color: "grey",
                            fontSize: 25,
                            fontFamily: "MPLUSLatin_Bold",
                          }}
                        >
                          Register
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* status bar */}
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
