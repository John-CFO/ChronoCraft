//////////////////////////////DetailsProjectCard Component////////////////////////

// This component shows the project name and the local time.

//////////////////////////////////////////////////////////////////////////////////

import { View, Text } from "react-native";
import React from "react";
import { useRoute, RouteProp } from "@react-navigation/native";
import { CopilotStep, walkthroughable } from "react-native-copilot";

import DigitalClock from "../components/DigitalClock";

//////////////////////////////////////////////////////////////////////////////////

type RootStackParamList = {
  Details: { projectName: string };
};

type DetailsProjectRouteProps = RouteProp<RootStackParamList>;

interface DetailsProjectCardProps {
  showTour?: boolean;
}

//////////////////////////////////////////////////////////////////////////////////
const DetailsProjectCard: React.FC<DetailsProjectCardProps> = () => {
  // route params
  const route = useRoute<DetailsProjectRouteProps>();
  const { projectName } = route.params;

  // modified walkthroughable for copilot tour
  const CopilotTouchableView = walkthroughable(View);

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
      {/* DetailsScreen copilot tour step 1 */}
      <CopilotStep
        name="Title and Time"
        order={1}
        text="This Info Card shows the name of the project and your local time."
      >
        {/* project name */}
        <CopilotTouchableView
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
        </CopilotTouchableView>
      </CopilotStep>
    </View>
  );
};

export default DetailsProjectCard;
