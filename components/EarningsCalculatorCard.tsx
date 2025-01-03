//////////////////////////////////////////// Earnings Calculator Card Component //////////////////////////////////

// this component is used to show the earnings calculator card in the details screen
// the user can set the hourly rate and the component will calculate the earnings based on the time tracked by the time tracker card
// it used ProjectContext.tsx to get the project id to save the background task and let the Tracker work in the background

import { View, Text, TextInput, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Alert } from "react-native";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";
import { updateProjectData } from "../components/FirestoreService";
import { useStore } from "./TimeTrackingState";

////////////////////////////////////////////////////////////////////////////////////////////////////////
type RootStackParamList = {
  Details: { projectId: string };
};

type EarningsCalculatorRouteProp = RouteProp<RootStackParamList, "Details">;
export type EarningsCalculatorCardProp = RouteProp<
  RootStackParamList,
  "Details"
>;

interface EarningsCalculatorCardProps {
  route: EarningsCalculatorRouteProp;
  projectId: string;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

const EarningsCalculatorCard: React.FC<EarningsCalculatorCardProps> = () => {
  // navigation
  const route = useRoute<EarningsCalculatorRouteProp>();
  const navigation = useNavigation();

  // route params
  const { projectId } = route.params;
  // console.log("route.params:", route.params);

  // console.log("EarningsCalculatorCard - projectId:", projectId);

  // global state
  const {
    setHourlyRate,
    getProjectState,
    calculateEarnings,
    isTracking,
    currentProjectId,
  } = useStore();

  // local state
  const projectState = getProjectState(projectId) || {
    hourlyRate: 0,
    totalEarnings: 0,
  };

  // initialize local hourly rate to save the state when user navigates away from the screen
  const [rateInput, setRateInput] = useState<string>("");
  const [totalEarnings, setTotalEarnings] = useState<number>(
    projectState.totalEarnings
  );

  // function to calculate lively earnings
  // Sync totalEarnings with global state
  useEffect(() => {
    if (isTracking) {
      const intervalId = setInterval(() => {
        calculateEarnings(currentProjectId as string);
      }, 1000);

      return () => clearInterval(intervalId); // Cleanup when effect ends
    }
  }, [isTracking, currentProjectId]);

  // Add another useEffect to synchronize the local totalEarnings with the global one
  useEffect(() => {
    if (currentProjectId) {
      const projectState = getProjectState(currentProjectId);
      if (projectState) {
        setTotalEarnings(projectState.totalEarnings);
      }
    }
  }, [currentProjectId, getProjectState]);

  // function to show hourly rate with snapshot in the UI
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
        // Reference to the document in Firestore
        const docRef = doc(
          FIREBASE_FIRESTORE,
          "Users",
          user.uid,
          "Services",
          "AczkjyWoOxdPAIRVxjy3",
          "Projects",
          projectId
        );

        // Get document snapshot
        const docSnap = await getDoc(docRef);

        // If document exists, retrieve the data
        if (docSnap.exists()) {
          const data = docSnap.data();

          // extract hourly rate and total earnings
          const fetchedRate = data?.hourlyRate || 0;
          const fetchedEarnings = data?.totalEarnings || 0;

          // update Zustand global state
          setHourlyRate(projectId, fetchedRate);
          setTotalEarnings(fetchedEarnings); // Update local state

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
  const handleSave = async () => {
    const rate = parseFloat(rateInput);
    if (!isNaN(rate)) {
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
      // alert to inform user what he has to do first before pressed the save button
    } else {
      Alert.alert("Sorry", "Please enter a hourly rate first.");
    }
  };

  return (
    <View>
      {/* Earnings Calculator Card */}
      <View
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
          Earnings Calculator
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
          <View
            style={{
              backgroundColor: "lightgrey",
              width: 280,
              height: 50,
              borderWidth: 2,
              borderColor: "white",
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <TextInput
              placeholder="Enter your hourly rate"
              placeholderTextColor="grey"
              keyboardType="numeric"
              value={rateInput}
              onChangeText={handleRateChange}
              style={{
                marginBottom: 10,
                height: 40,
                paddingHorizontal: 10,
                fontSize: 22,
              }}
            />
          </View>
          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            style={{
              width: 280,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 3,
              borderColor: "white",
              marginBottom: 20,
            }}
          >
            <LinearGradient
              colors={["#00FFFF", "#FFFFFF"]}
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 45,
                width: 280,
              }}
            >
              <Text
                style={{
                  fontFamily: "MPLUSLatin_Bold",
                  fontSize: 22,
                  color: "grey",
                  marginBottom: 5,
                }}
              >
                Save
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
      </View>
    </View>
  );
};

export default EarningsCalculatorCard;
