import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  findNodeHandle,
  AccessibilityInfo,
} from "react-native";
import React, { useEffect, useRef } from "react";
import Modal from "react-native-modal";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import { useAccessibilityStore } from "../accessibility/accessibilityStore";
import { LANGUAGE_OPTIONS, type SupportedLanguage } from "./languages";
import { changeLanguage } from "./i18n";

////////////////////////////////////////////////////////////////////////////////

interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
}

////////////////////////////////////////////////////////////////////////////////

const LanguageModal: React.FC<LanguageModalProps> = ({ visible, onClose }) => {
  const { i18n, t } = useTranslation();

  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  const languageTitleRef = useRef<Text>(null);

  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    if (!visible) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(t("languageModalOpened"));

    const timeout = setTimeout(() => {
      if (languageTitleRef.current) {
        const node = findNodeHandle(languageTitleRef.current);

        if (node) {
          AccessibilityInfo.setAccessibilityFocus(node);
        }
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [visible, t]);

  const handleSelect = async (language: SupportedLanguage) => {
    try {
      await changeLanguage(language);
      onClose();
    } catch (error) {
      console.error("[LanguageModal] Failed to change language:", error);
    }
  };

  const currentLanguage = i18n.resolvedLanguage;

  return (
    <Modal
      accessibilityViewIsModal
      accessibilityLabel={t("languageModal")}
      isVisible={visible}
      backdropColor="black"
      onBackdropPress={onClose}
      swipeDirection={["up", "down"]}
      onSwipeComplete={onClose}
      style={{
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        accessible={true}
        accessibilityViewIsModal={true}
        style={{
          width: screenWidth * 0.9,
          maxWidth: 600,
          maxHeight: "85%",
          backgroundColor: "black",
          padding: 20,
          borderRadius: 15,
          borderWidth: 2,
          borderColor: "lightgrey",
          alignItems: "center",
        }}
      >
        {/* Header */}

        <View
          accessibilityRole="header"
          accessibilityLabel={t("select Language")}
          style={{
            width: 330,
            height: 80,
            borderBottomColor: "lightgrey",
            borderBottomWidth: 0.5,
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <Text
            ref={languageTitleRef}
            style={{
              color: "white",
              fontSize: 32,
              fontFamily: "MPLUSLatin_Bold",
              marginBottom: 11,
              marginRight: 9,
            }}
          >
            {t("select Language")}
          </Text>
        </View>

        {/* Language options */}

        <FlatList
          style={{
            marginTop: 20,
            marginBottom: 20,
            width: "100%",
          }}
          data={LANGUAGE_OPTIONS}
          keyExtractor={(item) => item.code}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = item.code === currentLanguage;

            return (
              <TouchableOpacity
                style={{
                  borderRadius: 8,
                  overflow: "hidden",
                  marginBottom: 8,
                  width: "100%",
                }}
                onPress={() => handleSelect(item.code)}
                accessibilityRole="button"
                accessibilityLabel={`${item.nativeName}${
                  isSelected ? `, ${t("currentLanguage")}` : ""
                }`}
                accessibilityState={{
                  selected: isSelected,
                }}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={["#00f7f7", "#005757"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 15,
                      width: "100%",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: accessMode ? 28 : 24,
                        marginRight: 15,
                      }}
                    >
                      {item.flag}
                    </Text>

                    <Text
                      style={{
                        fontSize: accessMode ? 22 : 18,
                        color: "#191919",
                        fontWeight: "bold",
                      }}
                    >
                      {item.nativeName}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 15,
                      width: "100%",
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: accessMode ? 28 : 24,
                        marginRight: 15,
                      }}
                    >
                      {item.flag}
                    </Text>

                    <Text
                      style={{
                        fontSize: accessMode ? 22 : 18,
                        color: "white",
                      }}
                    >
                      {item.nativeName}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />

        {/* Navigation tip */}

        <View
          style={{
            height: 45,
            width: 330,
            marginTop: 20,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            accessible
            accessibilityLabel={t("navigationTip")}
            accessibilityHint={t("navigationTipHint")}
            style={{
              fontSize: accessMode ? 20 : 18,
              color: accessMode ? "white" : "lightgrey",
              fontFamily: accessMode
                ? "MPLUSLatin_Regular"
                : "MPLUSLatin_ExtraLight",
            }}
          >
            {t("swipe to close")}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default LanguageModal;
