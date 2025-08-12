//////////////////////////////DetailsProjectCard Component////////////////////////

// This component shows the project name and the local time.

//////////////////////////////////////////////////////////////////////////////////

import { View, Text } from "react-native";
import React from "react";
import { useRoute, RouteProp } from "@react-navigation/native";
import { CopilotStep, walkthroughable } from "react-native-copilot";

import DigitalClock from "../components/DigitalClock";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";

//////////////////////////////////////////////////////////////////////////////////

type RootStackParamList = {
  Details: { projectName: string };
};

type DetailsProjectRouteProps = RouteProp<RootStackParamList>;

interface DetailsProjectCardProps {
  showTour?: boolean;
}

//////////////////////////////////////////////////////////////////////////////////

// modified walkthroughable for copilot tour
const CopilotTouchableView = walkthroughable(View);

const DetailsProjectCard: React.FC<DetailsProjectCardProps> = () => {
  // route params
  const route = useRoute<DetailsProjectRouteProps>();
  const { projectName } = route.params;

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

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
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel="- Project Details -"
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
            accessible={true}
            accessibilityLabel={`Project Name: ${projectName}`}
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
              fontSize: accessMode ? 20 : 18,
              fontFamily: accessMode
                ? "MPLUSLatin_Bold"
                : "MPLUSLatin_ExtraLight",
              color: "lightgrey",
              marginTop: 30,
            }}
          >
            "Current Time"
          </Text>

          <DigitalClock />
        </CopilotTouchableView>
      </CopilotStep>
    </View>
  );
};

export default DetailsProjectCard;
