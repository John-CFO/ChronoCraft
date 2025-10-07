///////////////////////////login screen with firebase registry/////////////////////////////////

// This screen handles user login and registration using Firebase Authentication.
// Two-factor authentication is implemented via device verification, cryptography, and optionally reCAPTCHA.
// Users can log in or register with email and password.
// The screen also includes accessibility features to improve usability for users with disabilities.

///////////////////////////////////////////////////////////////////////////////////////////////

import {
  View,
  Dimensions,
  StatusBar,
  ImageBackground,
  StyleSheet,
  Image,
} from "react-native";
import React, { useState, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  Auth,
  User,
} from "firebase/auth";
import { setDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import {
  ALERT_TYPE,
  Toast,
  AlertNotificationRoot,
} from "react-native-alert-notification";
import { NotificationManager } from "../components/services/PushNotifications";
import { BlurView } from "expo-blur";

import { FIREBASE_APP, FIREBASE_FIRESTORE } from "../firebaseConfig";
import { AuthContext } from "../components/contexts/AuthContext";
import { RootStackParamList } from "../navigation/RootStackParams";
import AppLogo from "../components/AppLogo";
import AnimatedText from "../components/AnimatedText";
import DismissKeyboard from "../components/DismissKeyboard";
import { useAlertStore } from "../components/services/customAlert/alertStore";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import AuthForm from "../components/AuthForm";
import { verifyToken } from "../components/utils/totp";
import TotpCodeModal from "../components/TotpCodeModal";
import {
  LoginInputSchema,
  RegisterInputSchema,
  TotpCodeSchema,
} from "../validation/authSchemas";
import { FirestoreUserSchema } from "../validation/firestoreSchemas";
import { UserProfile } from "../components/types/UserProfile";

//////////////////////////////////////////////////////////////////////////////////////////////

type RegisterScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Login"
>;

////////////////////////////////////////////////////////////////////////////////////////////

const LoginScreen: React.FC = () => {
  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // declaire the navigation to user get in after logein
  const navigation = useNavigation<RegisterScreenNavigationProp>();

  const [totpModalVisible, setTotpModalVisible] = useState(false);
  const [totpLoading, setTotpLoading] = useState(false);
  const [pendingTotpSecret, setPendingTotpSecret] = useState<string | null>(
    null
  );

  // states for registry and login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // state to handle the loading animation
  const [loading, setLoading] = useState<boolean>(false);

  // declaire the firebase authentication
  const auth: Auth = getAuth(FIREBASE_APP);
  // declaire the user context
  const { setUser } = useContext(AuthContext);
  // declaire the pending user state
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // function to validate the inputs
  const validateLoginInputs = () => {
    const parsed = LoginInputSchema.safeParse({ email, password });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid input";
      useAlertStore.getState().showAlert("Validation Error", msg);
      return false;
    }
    return true;
  };

  // Registration
  const validateRegisterInputs = () => {
    const parsed = RegisterInputSchema.safeParse({ email, password });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid input";
      useAlertStore.getState().showAlert("Validation Error", msg);
      return false;
    }
    return true;
  };

  // function to handle the login process
  const handleLogin = async () => {
    if (!validateLoginInputs()) return;
    setLoading(true);

    try {
      // 1️⃣ Sign in with Firebase Auth
      const response = await signInWithEmailAndPassword(
        getAuth(FIREBASE_APP),
        email,
        password
      );
      const user = response.user; // FirebaseUser
      setPendingUser(user); // save for TOTP modal later

      // get Firestore user document
      const userRef = doc(FIREBASE_FIRESTORE, "Users", user.uid);
      const userSnap = await getDoc(userRef);

      let userData: UserProfile | null = null;

      if (userSnap.exists()) {
        const raw = userSnap.data();
        const parsed = FirestoreUserSchema.safeParse(raw);

        if (parsed.success) {
          // Add uid from Firebase user
          userData = { ...parsed.data, uid: user.uid };

          // handle first login flag
          if (userData.firstLogin) {
            await setDoc(userRef, { firstLogin: false }, { merge: true });
          }
        } else {
          console.warn("Invalid Users doc for", user.uid, parsed.error);
        }
      }

      // TS-Safe check
      if (!userData) {
        // No valid user data from Firestore
        setUser(user); // fallback to FirebaseUser only
        setLoading(false);
        return;
      }

      // If TOTP is active
      if (userData.totpEnabled) {
        const totpSecret = userData.totpSecret ?? null;

        if (!totpSecret) {
          useAlertStore
            .getState()
            .showAlert("2FA Error", "TOTP not configured.");
          await signOut(getAuth(FIREBASE_APP));
          // Save secret for TOTP modal
          setPendingUser(null);
          setLoading(false);
          return;
        }

        setPendingTotpSecret(totpSecret);
        setTotpModalVisible(true);
        setLoading(false);
        return; // TOTP flow handled by modal
      }

      // No TOTP → normal login
      setUser(user);
    } catch (error) {
      console.error(error);
      useAlertStore
        .getState()
        .showAlert("Login failed", "Something went wrong, please try again!");
    } finally {
      setLoading(false);
    }
  };

  //  function to handle TOTP submit
  const handleTotpSubmit = async (code: string) => {
    // validate code
    const codeParsed = TotpCodeSchema.safeParse(code);
    if (!codeParsed.success) {
      const msg = codeParsed.error.issues[0]?.message ?? "Invalid code";
      useAlertStore.getState().showAlert("Wrong Code", msg);
      return;
    }
    setTotpLoading(true);
    try {
      if (!pendingTotpSecret) throw new Error("missing-totp-secret");
      // get the validation result
      const ok = verifyToken(pendingTotpSecret, codeParsed.data);
      if (!ok) {
        useAlertStore
          .getState()
          .showAlert("Wrong Code", "The code you entered is not valid.");
        setTotpLoading(false);
        return;
      }

      // TOTP validated -> set global user to allow navigation
      const finalUser = pendingUser ?? getAuth(FIREBASE_APP).currentUser;
      if (finalUser) {
        setUser(finalUser); // App changes to Inside/Drawer
      } else {
        // Fallback: if somehow no user available, sign out and show error
        await signOut(getAuth(FIREBASE_APP));
        useAlertStore
          .getState()
          .showAlert("Error", "Internal error after TOTP validation.");
        setTotpModalVisible(false);
        setPendingTotpSecret(null);
        setPendingUser(null);
        setTotpLoading(false);
        return;
      }

      useAlertStore.getState().showAlert("Welcome", "Successfully logged in.");

      // clear pending secret and close modal
      setPendingTotpSecret(null);
      setPendingUser(null);
      setTotpModalVisible(false);

      // optional navigation (App should already react to setUser)
      setUser(finalUser);
    } catch (e) {
      console.error("TOTP validation error:", e);
      useAlertStore.getState().showAlert("Error", "TOTP-Validation failed.");
      try {
        await signOut(getAuth(FIREBASE_APP));
      } catch (err) {}
      setTotpModalVisible(false);
      setPendingTotpSecret(null);
      setPendingUser(null);
    } finally {
      setTotpLoading(false);
    }
  };

  // function to handle TOTP cancel
  const handleTotpCancel = async () => {
    try {
      setTotpModalVisible(false);
      setPendingTotpSecret(null);
      // Security: signOut during TOTP cancel
      await signOut(getAuth(FIREBASE_APP));
    } catch (e) {
      // ignore signOut errors, but log them for debugging
      console.warn("signOut during TOTP cancel failed", e);
    }
  };

  // funcion to handle the registry process
  const handleRegister = async () => {
    if (!validateRegisterInputs()) return;
    setLoading(true);
    try {
      const response = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = response.user.uid;
      await createUserDocument(uid, {
        email: email,
        firstLogin: true,
      });

      // initialize push notifications
      const token = await NotificationManager.registerForPushNotifications();
      if (token) {
        await NotificationManager.savePushTokenToDatabase(uid, token);
        await NotificationManager.sendWelcomeNotification(token);
      }

      // Navigation
      setUser(response.user);
    } catch (error) {
      console.error("Registration failed:", error);
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
      await setDoc(
        userRef,
        {
          ...userData,
          createdAt: serverTimestamp(),
          hasSeenHomeTour: userData.hasSeenHomeTour ?? false,
          hasSeenDetailsTour: userData.hasSeenDetailsTour ?? false,
          hasSeenVacationTour: userData.hasSeenVacationTour ?? false,
          hasSeenWorkHoursTour: userData.hasSeenWorkHoursTour ?? false,
        },
        { merge: true } // usefull to prevent overwriting
      );
    } catch (error) {
      console.error("Error creating user document:", error);
      throw error;
    }
  };

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

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
      {/* TotpCodeModal will displayed after login in if 2FA is activated */}
      <TotpCodeModal
        visible={totpModalVisible}
        loading={totpLoading}
        onCancel={handleTotpCancel}
        onSubmit={handleTotpSubmit}
      />
    </AlertNotificationRoot>
  );
};

export default LoginScreen;
