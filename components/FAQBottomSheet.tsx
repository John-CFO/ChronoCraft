import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Collapsible from "react-native-collapsible";

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
          ........................................
        </Text>
      </Collapsible>
    </View>
  );
};

export default FAQBottomSheet;
