//////////////////////////////////////////////////////////////////////////////

// This component is used to display the login and register form
// The user can enter their email and password and click the login or register button

// The user can also click the forgot password button to reset the password
// It includes als a secure text entry toggle eye icon to show or hide the password
// Also accessibility features are included to make the app more accessible for users with disabilities

//////////////////////////////////////////////////////////////////////////////

import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Dimensions,
} from "react-native";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome5 } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import LostPasswordModal from "../components/LostPasswordModal";

//////////////////////////////////////////////////////////////////////////////

interface AuthFormProps {
  email: string;
  password: string;
  setEmail: (text: string) => void;
  setPassword: (text: string) => void;
  handleLogin: () => void;
  handleRegister: () => void;
}

//////////////////////////////////////////////////////////////////////////////

const AuthForm: React.FC<AuthFormProps> = ({
  email,
  password,
  setEmail,
  setPassword,
  handleLogin,
  handleRegister,
}) => {
  // useTranslation hook to access translations
  const { t } = useTranslation();

  const [secureTextEntry, setSecureTextEntry] = useState(true);
  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // states for LostPasswordModal
  const [isModalVisible, setModalVisible] = useState(false);

  // function to toggle the LostPasswordModal to open or close
  const toggleModal = () => {
    setModalVisible((prev) => !prev);
  };

  return (
    <View style={{ gap: 10, width: "80%", alignSelf: "center" }}>
      <View
        style={{
          gap: 10,
          justifyContent: "space-around",
          alignItems: "center",
        }}
      >
        {/* Email input */}
        <TextInput
          placeholder={t("auth.email")}
          placeholderTextColor={accessMode ? "white" : "grey"}
          autoCapitalize="none"
          onChangeText={(text) => setEmail(text)}
          value={email}
          keyboardType="email-address"
          textContentType="emailAddress"
          accessible={true}
          importantForAccessibility="yes"
          returnKeyType="next"
          accessibilityLabel={t("auth.emailLabel")}
          accessibilityHint={t("auth.emailHint")}
          style={{
            borderColor: "aqua",
            borderWidth: 1.5,
            borderRadius: 12,
            paddingLeft: 15,
            fontSize: 22,
            paddingBottom: 5,
            height: 50,
            width: screenWidth * 0.7, // use 70% of the screen width
            maxWidth: 400,
            color: "white",
            backgroundColor: "#191919",
          }}
        />
        <View
          style={{
            position: "relative",
            width: screenWidth * 0.7,
            maxWidth: 400,
          }}
        >
          {/* Password input */}
          <TextInput
            placeholder={t("auth.password")}
            placeholderTextColor={accessMode ? "white" : "grey"}
            autoCapitalize="none"
            secureTextEntry={secureTextEntry}
            onChangeText={(text) => setPassword(text)}
            value={password}
            textContentType="password"
            accessible={true}
            accessibilityLabel={t("auth.passwordLabel")}
            accessibilityHint={t("auth.passwordHint")}
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
          />
          {/* Visibility eye button */}
          <TouchableOpacity
            onPress={() => setSecureTextEntry(!secureTextEntry)}
            style={{
              position: "absolute",
              right: 15,
              top: 13,
            }}
            accessibilityRole="button"
            accessibilityLabel={
              secureTextEntry ? t("auth.showPassword") : t("auth.hidePassword")
            }
            accessibilityState={{ expanded: secureTextEntry ? false : true }}
          >
            <FontAwesome5
              name={secureTextEntry ? "eye" : "eye-slash"}
              size={20}
              color={accessMode ? "white" : "darkgrey"}
            />
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 10, alignItems: "center" }}>
          {/* Login button */}
          <TouchableOpacity
            onPress={handleLogin}
            accessibilityRole="button"
            accessibilityLabel={t("auth.login")}
            accessibilityHint={t("auth.loginHint")}
            style={{
              width: screenWidth * 0.7, // use 70% of the screen width
              maxWidth: 400,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 1.5,
              borderColor: "aqua",
              marginBottom: 8,
            }}
          >
            <LinearGradient
              colors={["#00f7f7", "#005757"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 45,
                width: screenWidth * 0.7, // use 70% of the screen width
                maxWidth: 400,
              }}
            >
              <Text
                style={{
                  fontFamily: "MPLUSLatin_Bold",
                  fontSize: 22,
                  color: "white",
                  textAlign: "center",
                  transform: [{ translateY: -3 }],
                }}
              >
                {t("auth.login")}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Register button */}
          <TouchableOpacity
            onPress={handleRegister}
            accessibilityRole="button"
            accessibilityLabel={t("auth.register")}
            accessibilityHint={t("auth.registerHint")}
            style={{
              width: screenWidth * 0.7, // use 70% of the screen width
              maxWidth: 400,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 1.5,
              borderColor: "aqua",
            }}
          >
            <LinearGradient
              colors={["#00f7f7", "#005757"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 45,
                width: screenWidth * 0.7, // use 70% of the screen width
                maxWidth: 400,
              }}
            >
              <Text
                style={{
                  fontFamily: "MPLUSLatin_Bold",
                  fontSize: 22,
                  color: "white",
                  textAlign: "center",
                  transform: [{ translateY: -3 }],
                }}
              >
                {t("auth.register")}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          {/* LostPasswordModal */}
          <TouchableOpacity
            onPress={toggleModal}
            accessibilityRole="button"
            accessibilityLabel={t("auth.forgotPassword")}
            accessibilityHint={t("auth.forgotPasswordHint")}
            accessibilityState={{ expanded: isModalVisible }}
            style={{ marginTop: 50 }}
          >
            <Text
              style={{
                color: accessMode ? "white" : "aqua",
                textDecorationLine: "underline",
                fontSize: accessMode ? 20 : 16,
              }}
            >
              {t("auth.forgotPassword")}
            </Text>
          </TouchableOpacity>
          <LostPasswordModal visible={isModalVisible} onClose={toggleModal} />
        </View>
      </View>
    </View>
  );
};

export default AuthForm;
