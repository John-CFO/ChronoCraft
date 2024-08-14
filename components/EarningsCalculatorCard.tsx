//////////////////////////////////////////// Earnings Calculator Card Component //////////////////////////////////

// this component is used to show the earnings calculator card in the details screen
// the user can set the hourly rate and the component will calculate the earnings based on the time tracked by the time tracker card
// it used ProjectContext.tsx to get the project id to save the background task and let the Tracker work in the background

// TODOS!!!! Your Hourly Rate soll erst übergeben werden wenn ich save drücke, nicht beim eintippen.

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

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { number } from "yup";
import { updateProjectData } from "../components/FirestoreService";
import { useStore } from "./TimeTrackingState";

////////////////////////////////////////////////////////////////////////////////////////////////////////
type RootStackParamList = {
  Details: { projectId: string };
};

interface ProjectTrackingStatus {
  isTracking: boolean;
  trackingProjectName: string;
}

type EarningsCalculatorRouteProp = RouteProp<RootStackParamList, "Details">;

////////////////////////////////////////////////////////////////////////////////////////////////////////

const EarningsCalculatorCard = (/*{ projectId }: { projectId: string }*/) => {
  const route = useRoute<EarningsCalculatorRouteProp>();
  const { projectId } = route.params;
  console.log("route.params:", route.params);

  console.log("EarningsCalculatorCard - projectId:", projectId);

  const { setHourlyRate, getProjectState } = useStore();

  const projectState = getProjectState(projectId) || {
    hourlyRate: 0,
    totalEarnings: 0,
  };

  // const { hourlyRate, totalEarnings } = projectState;

  const [rateInput, setRateInput] = useState<string>(
    projectState.hourlyRate.toString() || "0"
  );

  useEffect(() => {
    if (projectId) {
      setRateInput(projectState.hourlyRate.toString());
      const fetchHourlyRate = async () => {
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
            setHourlyRate(projectId, data.hourlyRate || 0);
          }
        } catch (error) {
          console.error("Error fetching hourly rate:", error);
        }
      };
      fetchHourlyRate();
    } else {
      console.error("projectId is not defined");
    }
  }, [projectId, setHourlyRate]);

  /*const [rateInput, setRateInput] = useState<string | null>(
    hourlyRate > 0 ? hourlyRate.toString() : null
  );

  // useEffect to update the input field with the hourly rate
  useEffect(() => {
    setRateInput(hourlyRate > 0 ? hourlyRate.toString() : "");
  }, [hourlyRate]);

  // useEffect to update the input field with the hourly rate
  useEffect(() => {
    if (hourlyRate > 0) {
      setRateInput(hourlyRate.toString());
    }
  }, [hourlyRate]); */

  // Funktion zum Umgang mit der Eingabeänderung
  const handleRateChange = (text: string) => {
    setRateInput(text);
    const rate = parseFloat(text);
    if (!isNaN(rate)) {
      setHourlyRate(projectId, rate);
    }
  };

  // function to save the hourly rate in firestore
  const handleSave = async () => {
    try {
      console.log("Saving hourly rate in Firestore with projectId:", projectId);
      await updateProjectData(projectId, {
        hourlyRate: projectState.hourlyRate,
      });
      setRateInput(""); // Eingabefeld leeren
    } catch (error) {
      console.error("Fehler beim Speichern des Stundenlohns: ", error);
    }
  };

  return (
    <View>
      <View
        style={{
          height: 405,
          marginBottom: 20,
          backgroundColor: "#191919",
          borderWidth: 1,
          borderColor: "aqua",
          borderRadius: 8,
          padding: 20,
          alignItems: "center",
        }}
      >
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
            ${projectState.totalEarnings || "0.00"}
          </Text>
        </View>
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
              value={rateInput !== null ? rateInput : ""}
              onChangeText={handleRateChange}
              style={{
                marginBottom: 10,
                height: 40,
                paddingHorizontal: 10,
                fontSize: 22,
              }}
            />
          </View>
          <TouchableOpacity
            onPress={handleSave}
            style={{
              width: 280,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 3,
              borderColor: "white",
              marginBottom: 30,
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

          <View
            style={{
              width: "100%",
              height: 30,
              alignItems: "flex-start",
              justifyContent: "flex-end",
            }}
          >
            <Text
              style={{
                fontFamily: "MPLUSLatin_Bold",
                fontSize: 16,
                color: "white",
                marginBottom: 5,
              }}
            >
              <Text style={{ color: "grey" }}>Your Hourly Rate: </Text>
              {projectState.hourlyRate.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default EarningsCalculatorCard;
