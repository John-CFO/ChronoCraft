///////////////////////////login screen with firebase registry/////////////////////////////////

import {
  View,
  TextInput,
  Text,
  Platform,
  ActivityIndicator,
  StatusBar,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Alert,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useState, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  Auth,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  ALERT_TYPE,
  Toast,
  AlertNotificationRoot,
} from "react-native-alert-notification";
import PopupDialog, {
  DialogContent,
  SlideAnimation,
} from "react-native-popup-dialog";
import { LinearGradient } from "expo-linear-gradient";
import {
  setDoc,
  doc,
  getDoc,
  collection,
  onSnapshot,
  getFirestore,
} from "firebase/firestore";
import messaging from "@react-native-firebase/messaging";
import { FIREBASE_APP, FIREBASE_FIRESTORE } from "../firebaseConfig";
import AppLogo from "../components/AppLogo";
import AnimatedText from "../components/AnimatedText";

//////////////////////////////////////////////////////////////////////////////////////////////

type UnsubscribeFunction = (() => void) | null;
const LoginScreen: React.FC = () => {
  // declaire the navigation to user get in after logein
  const navigation = useNavigation();

  // states for registry and login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<boolean>(false);

  // inizialize firebase authentication
  const auth: Auth = getAuth(FIREBASE_APP);

  // states for success dialog
  const [successDialogVisible, setSuccessDialogVisible] = useState(false);

  // state for usersnapshot to verify if user is logget in or not
  const [userDocUnsubscribe, setUserDocUnsubscribe] =
    useState<UnsubscribeFunction>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  //const [userLoggedIn, setUserLoggedIn] = useState(false);

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
      //alert("something went wrong, try again!");
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
      //alert("Check your emails!");
    } catch (error) {
      console.log("Registration failed:", error);
      //alert("choose email and password and then click “Register”!");
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: "Registration failed",
        textBody: "choose email and password and then click Register!",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        //console.log("User logged in:", user);
        setCurrentUser(user);
        console.log("User logged in:", user);
        const userDocRef = doc(getFirestore(), "users", user.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            console.log("User document exists:", docSnapshot.data());
            setSuccessDialogVisible(true);
          } else {
            console.log("User document does not exist.");
          }
        });
        setUserDocUnsubscribe(() => unsubscribe);
      } else {
        setCurrentUser(null);
        console.log("User logged out");
        if (userDocUnsubscribe) {
          userDocUnsubscribe();
          setUserDocUnsubscribe(null);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
    };
  }, []);

  // function to create user document in firestore
  const createUserDocument = async (userId: string, userData: any) => {
    try {
      const userRef = doc(FIREBASE_FIRESTORE, "users", userId);
      await setDoc(userRef, userData, { merge: true });
      console.log("User document created successfully");

      //await verifyUserDocument(userId);
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
                  placeholder="Password"
                  autoCapitalize="none"
                  secureTextEntry={true}
                  onChangeText={(text) => setPassword(text)}
                  value={password}
                />
              </View>
              {loading ? (
                <ActivityIndicator
                  size="large"
                  color="blue"
                ></ActivityIndicator>
              ) : (
                <>
                  <View style={{ flexDirection: "row", margin: 20 }}>
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

            <StatusBar
              barStyle="light-content"
              translucent
              backgroundColor={"transparent"}
            />
          </ImageBackground>
          {/* registration success dialog */}

          <PopupDialog
            visible={successDialogVisible}
            onTouchOutside={() => setSuccessDialogVisible(false)}
            dialogAnimation={new SlideAnimation({ slideFrom: "bottom" })}
          >
            <DialogContent>
              <Text>Registration Success</Text>
              <Text>{`Success Dialog Visible: ${successDialogVisible}`}</Text>
            </DialogContent>
          </PopupDialog>
        </View>
      </KeyboardAvoidingView>
    </AlertNotificationRoot>
  );
};

export default LoginScreen;
