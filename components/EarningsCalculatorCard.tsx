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
import React, { useEffect, useState } from "react";
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
  const { setHourlyRate, getProjectState, currentProjectId } = useStore();

  // local state
  const projectState = getProjectState(projectId) || {
    hourlyRate: 0,
    totalEarnings: 0,
  };

  const setTotalEarnings = useStore((state) => state.setTotalEarnings);
  // initialize local hourly rate to save the state when user navigates away from the screen
  const [rateInput, setRateInput] = useState<string>("");

  // hook to synchronize the local totalEarnings with the global one
  useEffect(() => {
    if (currentProjectId) {
      const projectState = getProjectState(currentProjectId);
      if (projectState) {
        setTotalEarnings(currentProjectId, projectState.totalEarnings);
      }
    }
  }, [currentProjectId, getProjectState]);

  // hook to show hourly rate with snapshot in the UI
  useEffect(() => {
    const fetchHourlyRate = async () => {
      const user = FIREBASE_AUTH.currentUser;
      if (!user) {
        console.error("User is not authenticated.");
        return false;
      }
      if (projectId && rateInput === "") {
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
            const fetchedRate = data.hourlyRate || 0;

            // console.log("fetchHourlyRate - fetchedRate:", fetchedRate);
          }
        } catch (error) {
          console.error("Error fetching hourly rate:", error);
        }
      }
    };
    fetchHourlyRate();
  }, [projectId]);

  // function to fetch data from firestore if user navigate to details screen
  const fetchEarningsData = async (projectId: string) => {
    const user = FIREBASE_AUTH.currentUser;
    if (!user) {
      console.error("User is not authenticated.");
      return false;
    }
    if (projectId && rateInput === "") {
      try {
        // reference to the document in Firestore
        const docRef = doc(
          FIREBASE_FIRESTORE,
          "Users",
          user.uid,
          "Services",
          "AczkjyWoOxdPAIRVxjy3",
          "Projects",
          projectId
        );

        // get document snapshot
        const docSnap = await getDoc(docRef);

        // if document exists, retrieve the data
        if (docSnap.exists()) {
          const data = docSnap.data();

          // extract hourly rate and total earnings
          const fetchedRate = data?.hourlyRate || 0;
          const fetchedEarnings = data?.totalEarnings || 0;

          // update Zustand global state
          setHourlyRate(projectId, fetchedRate);
          setTotalEarnings(projectId, fetchedEarnings); // Update local state

          /*console.log("Earnings data fetched successfully:", {
            hourlyRate: fetchedRate,
            totalEarnings: fetchedEarnings,
          });*/
        } else {
          console.log("No document found for the provided projectId.");
        }
      } catch (error) {
        console.error("Error fetching earnings data from Firestore:", error);
      }
    }
  };

  // fetch earnings data when the component is mounted
  useEffect(() => {
    if (projectId) {
      fetchEarningsData(projectId);
    }
  }, [projectId]);

  // function to set the hourlyRate value in the textInput to empty if user navigates away from the screen
  useEffect(() => {
    const resetRateInput = () => {
      setRateInput(""); // clear input field when screen is re-entered
    };
    const unsubscribe = navigation.addListener("focus", resetRateInput);
    return () => {
      unsubscribe();
    };
  }, [navigation]);

  // function to set RateInput value as text
  const handleRateChange = (text: string) => {
    setRateInput(text);
  };

  // function to save the hourly rate in firestore
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    const rate = parseFloat(rateInput);
    if (!isNaN(rate)) {
      setSaving(true);
      try {
        /* console.log(
          "Saving hourly rate in Firestore with projectId:",
          projectId
        );*/
        await updateProjectData(projectId, {
          hourlyRate: rate,
        });
        setHourlyRate(projectId, rate);

        setRateInput(""); // clean input field
      } catch (error) {
        console.error("Error saving hourly rate: ", error);
      }
      setSaving(false);
      // alert to inform user what he has to do first before pressed the save button
    } else {
      useAlertStore
        .getState()
        .showAlert("Sorry", "Please enter a hourly rate first.");
    }
    setSaving(false);
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
              ${Number(projectState.totalEarnings || 0).toFixed(2)}
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
                {projectState?.hourlyRate}
              </Text>
            </View>
          </View>
        </CopilotWalkthroughView>
      </CopilotStep>
    </View>
  );
};

export default EarningsCalculatorCard;
