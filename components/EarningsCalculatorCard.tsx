//////////////////////////////////////////// Earnings Calculator Card Component //////////////////////////////////

// this component is used to show the earnings calculator card in the details screen
// the user can set the hourly rate and the component will calculate the earnings based on the time tracked by the time tracker card
// it used ProjectContext.tsx to get the project id to save the background task and let the Tracker work in the background

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  AppState,
  AppStateStatus,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { number } from "yup";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { updateProjectData } from "../components/FirestoreService";
import { useStore } from "./TimeTrackingState";

////////////////////////////////////////////////////////////////////////////////////////////////////////
type RootStackParamList = {
  Details: { projectId: string };
};

/*
interface ProjectTrackingStatus {
  isTracking: boolean;
  trackingProjectName: string;
} */

type EarningsCalculatorRouteProp = RouteProp<RootStackParamList, "Details">;

////////////////////////////////////////////////////////////////////////////////////////////////////////

const EarningsCalculatorCard = () => {
  // navigation
  const route = useRoute<EarningsCalculatorRouteProp>();
  const navigation = useNavigation();

  // route params
  const { projectId } = route.params;
  // console.log("route.params:", route.params);

  // console.log("EarningsCalculatorCard - projectId:", projectId);

  // global state
  const { setHourlyRate, getProjectState } = useStore();

  // local state
  const projectState = getProjectState(projectId) || {
    hourlyRate: 0,
    totalEarnings: 0,
  };

  // initialize local hourly rate to save the state when user navigates away from the screen
  const [rateInput, setRateInput] = useState<string>("");

  // function to set hourly rate from firestore to the UI using snapshot
  useEffect(() => {
    const fetchHourlyRate = async () => {
      if (projectId && rateInput === "") {
        try {
          const docRef = doc(
            FIREBASE_FIRESTORE,
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

  // function to set the hourlyRate value in the textInput to empty if user navigates away from the screen
  useEffect(() => {
    const resetRateInput = () => {
      setRateInput(""); // Clear input field when screen is re-entered
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
        console.error("Fehler beim Speichern des Stundenlohns: ", error);
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
            ${Number(projectState.totalEarnings || 0).toFixed(2)}{" "}
            {/* toFixed(2) rounds to 2 decimal places */}
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
              elevation: 5,
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
