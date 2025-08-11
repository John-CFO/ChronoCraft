//////////////////////////////////////////// Earnings Calculator Card Component //////////////////////////////////

// this component is used to show the earnings calculator card in the details screen
// the user can set the hourly rate and the component will calculate the earnings based on the time tracked by the time tracker card
// it used ProjectContext.tsx to get the project id to save the background task and let the Tracker work in the background

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import React, { useEffect, useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { CopilotStep, walkthroughable } from "react-native-copilot";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";
import { updateProjectData } from "../components/FirestoreService";
import { useStore } from "./TimeTrackingState";
import { useAlertStore } from "../components/services/customAlert/alertStore";
import { sanitizeRateInput } from "./InputSanitizers";

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

type RootStackParamList = {
  Details: { projectId: string };
};

export type EarningsCalculatorCardProp = RouteProp<
  RootStackParamList,
  "Details"
>;

interface EarningsCalculatorCardProps {
  projectId: string;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

// modified walkthroughable for copilot tour
const CopilotWalkthroughView = walkthroughable(View);

const EarningsCalculatorCard: React.FC<EarningsCalculatorCardProps> = ({
  projectId,
}) => {
  // navigation
  const navigation = useNavigation();

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // console.log("EarningsCalculatorCard - projectId:", projectId);

  // global state
  const { setHourlyRate } = useStore();
  const hourlyRate = useStore(
    (state) => state.projects[projectId]?.hourlyRate || 0
  );
  const totalEarnings = useStore(
    (state) => state.projects[projectId]?.totalEarnings || 0
  );

  // initialize local hourly rate to save the state when user navigates away from the screen
  const [rateInput, setRateInput] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // function to fetch data from firestore if user navigate to details screen
  const fetchEarningsData = useCallback(async () => {
    const user = FIREBASE_AUTH.currentUser;
    if (!user || !projectId) return;

    try {
      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        user.uid,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "Projects",
        projectId
      );

      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const fetchedRate = data?.hourlyRate || 0;
        const fetchedEarnings = data?.totalEarnings || 0;

        setHourlyRate(projectId, fetchedRate);
        useStore.getState().setTotalEarnings(projectId, fetchedEarnings);
      }
    } catch (error) {
      console.error("Error fetching earnings data:", error);
    }
  }, [projectId, setHourlyRate]);

  // hook to load by mount
  useEffect(() => {
    fetchEarningsData();
  }, [fetchEarningsData]);

  // hook to load by mount
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setRateInput("");
    });
    return unsubscribe;
  }, [navigation]);

  // function to handle rate change
  const handleRateChange = (text: string) => {
    setRateInput(text);
  };

  // function to handle save
  const handleSave = async () => {
    const rate = parseFloat(rateInput);
    if (!isNaN(rate)) {
      setSaving(true);
      try {
        await updateProjectData(projectId, { hourlyRate: rate });
        setHourlyRate(projectId, rate);
        setRateInput("");
      } catch (error) {
        console.error("Error saving hourly rate:", error);
      }
      setSaving(false);
    } else {
      useAlertStore
        .getState()
        .showAlert("Invalid Input", "Please enter a valid hourly rate.");
    }
  };

  return (
    <View>
      {/* DetailsScreen copilot tour step 3 */}
      <CopilotStep
        name="Earnings-Calculator"
        order={3}
        text="In this card you can set the hourly rate and the earnings will be calculated based on the time tracked by the Time-Tracker Card."
      >
        {/* Earnings Calculator Card */}
        <CopilotWalkthroughView
          style={{
            height: 420,
            marginBottom: 20,
            backgroundColor: "#191919",
            borderWidth: 1,
            borderColor: "aqua",
            borderRadius: 8,
            padding: 20,
            alignItems: "center",
          }}
        >
          {/* title */}
          <Text
            style={{
              fontFamily: "MPLUSLatin_Bold",
              fontSize: 25,
              color: "white",
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            Earnings-Calculator
          </Text>
          {/* Total Earnings viewport */}
          <View
            style={{
              width: "80%",
              height: 100,
              backgroundColor: "#191919",
              borderColor: "aqua",
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 55,
                color: "white",
                marginBottom: 5,
                textAlign: "center",
              }}
            >
              {/*the Number wrapper converts the totalEarnings into a Number to format it into a string with toFixed(2). 
            this is important to display the totalEarnings in the correct format to lively tracking the earnings*/}
              ${Number(totalEarnings || 0).toFixed(2)}
            </Text>
          </View>
          {/* Hourly Rate TextInput field*/}
          <View
            style={{
              marginTop: 30,
              width: "100%",
              backgroundColor: "#191919",
              alignItems: "center",
            }}
          >
            <TextInput
              placeholder="Enter your hourly rate"
              placeholderTextColor="grey"
              keyboardType="numeric"
              value={rateInput}
              onChangeText={(text) => handleRateChange(sanitizeRateInput(text))}
              style={{
                marginBottom: 15,
                width: screenWidth * 0.7, // use 70% of the screen width
                maxWidth: 400,
                borderColor: "aqua",
                borderWidth: 1.5,
                borderRadius: 12,
                paddingLeft: 15,
                paddingRight: 40,
                paddingBottom: 5,
                fontSize: 22,
                height: 50,
                color: "white",
                backgroundColor: "black",
              }}
            />

            {/* Save button */}
            <TouchableOpacity
              onPress={handleSave}
              style={{
                width: screenWidth * 0.7, // use 70% of the screen width
                maxWidth: 400,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: saving ? "lightgray" : "aqua",
                marginBottom: 30,
              }}
            >
              <LinearGradient
                colors={["#00f7f7", "#005757"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 6,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "MPLUSLatin_Bold",
                    fontSize: 22,
                    color: saving ? "lightgray" : "white",
                    marginBottom: 5,
                    paddingRight: 10,
                  }}
                >
                  {saving ? "Saving..." : "Save"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            {/* Hourly Rate info container */}
            <View
              style={{
                width: "100%",
                height: 50,
                alignItems: "flex-start",
                justifyContent: "center",
                paddingLeft: 10,
                borderRadius: 10,
                //shadow options for android
                shadowColor: "#ffffff",
                elevation: 2,
                //shadow options for ios
                shadowOffset: { width: 2, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
                backgroundColor: "#191919",
              }}
            >
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: "bold",
                  color: "white",
                  marginBottom: 5,
                }}
              >
                <Text
                  style={{
                    color: "grey",
                    fontSize: 16,
                    fontFamily: "MPLUSLatin_Bold",
                  }}
                >
                  Your Hourly Rate:{" "}
                </Text>
                {hourlyRate}
              </Text>
            </View>
          </View>
        </CopilotWalkthroughView>
      </CopilotStep>
    </View>
  );
};

export default EarningsCalculatorCard;
