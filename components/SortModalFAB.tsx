// ///////////////////////SortModalFAB Component////////////////////////////

// // This component is used to show a modal to sort the projects

// /////////////////////////////////////////////////////////////////////////

import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from "react-native";
import React from "react";

/////////////////////////////////////////////////////////////////////////////

type SortModalFABProps = {
  currentSort: string;
  onSortChange: (sortValue: string) => void;
  onClose: () => void;
};

/////////////////////////////////////////////////////////////////////////////

// options to sort the projects
const sortOptions = [
  { label: "Newest first", value: "DATE_DESC" },
  { label: "Oldest first", value: "DATE_ASC" },
  { label: "Name A–Z", value: "NAME_ASC" },
  { label: "Name Z–A", value: "NAME_DESC" },
];

const SortModalFAB = ({
  currentSort,
  onSortChange,
  onClose,
}: SortModalFABProps) => {
  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // function to handle sort selection
  const handleSelect = (value: string) => {
    onSortChange(value);
    onClose();
  };

  return (
    <View
      style={{
        width: screenWidth * 0.9,
        maxWidth: 600,
        backgroundColor: "black",
        padding: 20,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: "lightgrey",
        alignItems: "center",
      }}
    >
      {/* header */}
      <View
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
          style={{
            color: "white",
            fontSize: 32,
            fontFamily: "MPLUSLatin_Bold",
            marginBottom: 11,
            marginRight: 9,
          }}
        >
          Sort your projects
        </Text>
      </View>

      {/* sort options */}
      <FlatList
        style={{ marginTop: 20, marginBottom: 20, width: "100%" }}
        data={sortOptions}
        keyExtractor={(item) => item.value}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              paddingVertical: 12,
              paddingHorizontal: 10,
              borderRadius: 8,
              backgroundColor:
                item.value === currentSort ? "aqua" : "transparent",
              marginBottom: 8,
              alignItems: "center",
            }}
            onPress={() => handleSelect(item.value)}
          >
            <Text
              style={{
                fontSize: 16,
                color: item.value === currentSort ? "#191919" : "white",
                fontWeight: item.value === currentSort ? "bold" : "normal",
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* navigation tip */}
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
          style={{
            fontSize: 18,
            color: "lightgrey",
            fontFamily: "MPLUSLatin_ExtraLight",
          }}
        >
          swipe up or down to close
        </Text>
      </View>
    </View>
  );
};

export default SortModalFAB;
