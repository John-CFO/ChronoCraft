//////////////////////////////////////VacationBookingField Component////////////////////////////////

import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { LinearGradient } from "expo-linear-gradient";

////////////////////////////////////////////////////////////////////////////////////////////////////

const VacationBookingField = () => {
  return (
    <View
      style={{
        height: 80,
        flexDirection: "row",
        justifyContent: "space-around",
        paddingHorizontal: 70,
        alignItems: "center",
        borderBottomColor: "grey",
        borderWidth: 0.5,
        backgroundColor: "black",
      }}
    >
      {/* reserve button */}
      <TouchableOpacity
        style={{
          height: 45,
          width: 120,
          borderRadius: 8,
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

            height: 45,
            width: 120,
          }}
        >
          <Text
            style={{
              color: "grey",
              fontSize: 18,
              fontFamily: "MPLUSLatin_Bold",
              marginBottom: 11,
              marginRight: 9,
            }}
          >
            Reserve
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* cancel button */}
      <TouchableOpacity
        style={{
          height: 45,
          width: 120,
          borderRadius: 8,
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

            height: 45,
            width: 120,
          }}
        >
          <Text
            style={{
              color: "grey",
              fontSize: 18,
              fontFamily: "MPLUSLatin_Bold",
              marginBottom: 11,
              marginRight: 9,
            }}
          >
            Cancel
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default VacationBookingField;
