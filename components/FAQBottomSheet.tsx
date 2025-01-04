///////////////////////////////////FAQBottomSheet Component////////////////////////////////////////

import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Alert, TextInput } from "react-native";
import Collapsible from "react-native-collapsible";
import { doc, updateDoc } from "firebase/firestore";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { EmailAuthProvider } from "firebase/auth";
import { reauthenticateWithCredential } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";

///////////////////////////////////////////////////////////////////////////////////////////////////

const FAQBottomSheet = () => {
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    accountDeletion: false,
    faq1: false,
    faq2: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prevState) => ({
      ...prevState,
      [section]: !prevState[section],
    }));
  };

  return (
    <View style={{ padding: 20, backgroundColor: "white", borderRadius: 10 }}>
      {/* FAQ 1: Beispielinhalt */}
      <TouchableOpacity
        onPress={() => toggleSection("faq1")}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          How to change my password?
        </Text>
        <Text style={{ marginLeft: 10, fontSize: 18 }}>
          {expandedSections.faq1 ? "↑" : "↓"}
        </Text>
      </TouchableOpacity>
      <Collapsible collapsed={!expandedSections.faq1}>
        <Text style={{ marginTop: 10, fontSize: 14, color: "#555" }}>
          ........................................
        </Text>
      </Collapsible>

      {/* FAQ 2: Beispielinhalt */}
      <TouchableOpacity
        onPress={() => toggleSection("faq2")}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          How to add a project?
        </Text>
        <Text style={{ marginLeft: 10, fontSize: 18 }}>
          {expandedSections.faq2 ? "↑" : "↓"}
        </Text>
      </TouchableOpacity>
      <Collapsible collapsed={!expandedSections.faq2}>
        <Text style={{ marginTop: 10, fontSize: 14, color: "#555" }}>
          .........................................
        </Text>
      </Collapsible>

      {/* FAQ 3: Konto löschen */}
      <TouchableOpacity
        onPress={() => toggleSection("accountDeletion")}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          How to delete my account?
        </Text>
        <Text style={{ marginLeft: 10, fontSize: 18 }}>
          {expandedSections.accountDeletion ? "↑" : "↓"}
        </Text>
      </TouchableOpacity>
      <Collapsible collapsed={!expandedSections.accountDeletion}>
        <Text style={{ marginTop: 10, fontSize: 14, color: "#555" }}>
          To delete your account, you must confirm your password. If you delete
          your account, your data will no longer exist the next time you
          register.
        </Text>
        <TextInput
          placeholder="add your password"
          secureTextEntry
          style={{
            borderWidth: 1,
            borderRadius: 5,
            padding: 10,
            marginVertical: 20,
            borderColor: "#ccc",
          }}
        />
        <TouchableOpacity
          style={[
            {
              backgroundColor: "red",
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 5,
              marginTop: 10,
            },
          ]}
        >
          <Text
            style={{ color: "white", textAlign: "center", fontWeight: "bold" }}
          >
            {"Delete Account"}
          </Text>
        </TouchableOpacity>
      </Collapsible>
    </View>
  );
};

export default FAQBottomSheet;
