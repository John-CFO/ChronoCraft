/////////////////////////////////Workhours Screen////////////////////////////////////

import React from "react";
import { View, Text, SafeAreaView, ScrollView } from "react-native";

import WorkHoursState from "../components/WorkHoursState";
import WorkHoursInput from "../components/WorkHoursInput";
import WorkTimeTracker from "../components/WorkTimeTracker";
import WorkHoursChart from "../components/WorkHoursChart";
import ErrorBoundary from "../components/ErrorBoundary";

/////////////////////////////////////////////////////////////////////////////////////

const WorkHoursScreen = () => {
  const {} = WorkHoursState();

  return (
    <ScrollView
      style={{
        flex: 1,
        height: "100%",
        width: "100%",
      }}
    >
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            flex: 1,
            minHeight: "100%",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "black",
            padding: 16,
            width: "100%",
            height: "100%",
          }}
        >
          <Text
            style={{
              fontSize: 25,
              fontFamily: "MPLUSLatin_Bold",
              color: "white",
              marginBottom: 50,
            }}
          >
            - Workhours Management -
          </Text>
          {/* WorkHours Input */}
          <WorkHoursInput />
          <View style={{ marginTop: 50, width: "100%", alignItems: "center" }}>
            {/* Worktime Tracker */}
            <ErrorBoundary>
              <WorkTimeTracker />
            </ErrorBoundary>
          </View>
          {/* Workhours Chart */}
          <WorkHoursChart />
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

export default WorkHoursScreen;
