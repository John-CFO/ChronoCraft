//////////////////////////////DetailsProjectCard Component////////////////////////

import { View, Text } from "react-native";
import React from "react";
import { useRoute, RouteProp } from "@react-navigation/native";

import DigitalClock from "../components/DigitalClock";

//////////////////////////////////////////////////////////////////////////////////

type RootStackParamList = {
  Details: { projectName: string };
};

type DetailsProjectRouteProps = RouteProp<RootStackParamList>;

//////////////////////////////////////////////////////////////////////////////////
const DetailsProjectCard: React.FC = () => {
  // route params
  const route = useRoute<DetailsProjectRouteProps>();
  const { projectName } = route.params;
  return (
    <View>
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: 80,
          backgroundColor: "transparent",
        }}
      >
        {/* title */}
        <Text
          style={{
            fontFamily: "MPLUSLatin_Bold",
            fontSize: 25,
            color: "white",
            marginBottom: 20,
          }}
        >
          - Project Details -
        </Text>
      </View>
      {/* project name */}
      <View
        style={{
          marginBottom: 20,
          backgroundColor: "#191919",
          borderWidth: 1,
          borderColor: "aqua",
          borderRadius: 8,
          minHeight: 150,
          padding: 10,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "MPLUSLatin_Bold",
            fontSize: 32,
            color: "white",
            marginBottom: 10,
          }}
        >
          {projectName}
        </Text>
        {/* digital clock */}
        <Text
          style={{
            fontFamily: "MPLUSLatin_ExtraLight",
            fontSize: 18,
            color: "lightgrey",
            marginTop: 30,
          }}
        >
          Current Time
        </Text>
        <DigitalClock />
      </View>
    </View>
  );
};

export default DetailsProjectCard;
