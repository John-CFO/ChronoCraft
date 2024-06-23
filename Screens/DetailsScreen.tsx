import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import React, { useEffect, useState } from "react";
import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import {
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  collection,
} from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { PieChart } from "react-native-chart-kit";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Color } from "react-native-alert-notification/lib/typescript/service";
import { LinearGradient } from "expo-linear-gradient";
import DigitalClock from "../components/DigitalClock";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

interface Project {
  name: string;
  description: string;
  startDate: string;
  plannedHours: number;
}

interface DetailsScreenProps {
  route: RouteProp<RootStackParamList, "Details">;
}

type RootStackParamList = {
  Home: undefined;
  Details: { projectsId: string; projectName: string };
};

const DetailsScreen: React.FC<DetailsScreenProps> = () => {
  const route = useRoute<RouteProp<RootStackParamList, "Details">>();
  const navigation = useNavigation();
  const { projectsId, projectName } = route.params;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [pauseTime, setPauseTime] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState<string>("0.00");
  const [savedHourlyRate, setSavedHourlyRate] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);

  /*const fetchProjectDetails = async ({ projectId }: { projectId: string }) => {
    try {
      console.log(`Fetching project details for project ID: ${projectId}`);
      const projectDocRef = doc(
        FIREBASE_FIRESTORE,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "Projects",
        projectId
      );
      const projectDoc = await getDoc(projectDocRef);

      if (projectDoc.exists()) {
        console.log("Project document fetched: true");
        const projectData = projectDoc.data();
        console.log("Project data:", projectData);

        // Set state with fallback values
        setProject(projectData);
        setStartTime(projectData?.startTime ?? "N/A");
        setEndTime(projectData?.endTime ?? "N/A");
        setPauseTime(projectData?.pauseTime ?? "N/A");
        setHourlyRate(projectData?.hourlyRate ?? "0.00");
        setTotalEarnings(projectData?.totalEarnings ?? 0);

        console.log("startTime:", projectData?.startTime ?? "N/A");
        console.log("endTime:", projectData?.endTime ?? "N/A");
        console.log("pauseTime:", projectData?.pauseTime ?? "N/A");
        console.log("hourlyRate:", projectData?.hourlyRate ?? "0.00");
        console.log("totalEarnings:", projectData?.totalEarnings ?? 0);
      } else {
        console.log("Project document fetched: false");
      }
    } catch (error) {
      console.error("Error fetching project details:", error);
      // Hier könnten Sie state setzen, um einen Fehlerzustand zu behandeln oder eine Benachrichtigung anzuzeigen
    } finally {
      setLoading(false); // Setzen Sie loading auf false, wenn der Ladevorgang abgeschlossen ist
    }
  };

  useEffect(() => {
    const loadDetails = async () => {
      try {
        await fetchProjectDetails({ projectId: projectsId });
        console.log("Project details successfully fetched");
      } catch (error) {
        console.error("Error loading project details:", error);
      }
    };

    loadDetails();
  }, [projectsId]); */

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isTracking && startTime !== "N/A") {
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isTracking, startTime]);

  const saveTrackingData = async () => {
    try {
      if (startTime !== null && startTime !== "N/A") {
        const projectDocRef = doc(
          FIREBASE_FIRESTORE,
          "Services",
          "AczkjyWoOxdPAIRVxjy3",
          "Projects",
          projectsId
        );
        await updateDoc(projectDocRef, {
          startTime,
          endTime,
          pauseTime,
          elapsedTime,
          hourlyRate,
          totalEarnings,
        });
        console.log("Tracking data saved successfully");
      } else {
        console.log("Cannot save tracking data: startTime is not initialized");
      }
    } catch (error) {
      console.error("Error saving tracking data:", error);
      // Hier könnten Sie state setzen, um einen Fehlerzustand zu behandeln oder eine Benachrichtigung anzuzeigen
    }
  };

  // function to handle start, pause, and end tracking
  const handleStart = () => {
    if (!isTracking) {
      const now = new Date();
      setStartTime(now.toISOString());
      setIsTracking(true);
      saveTrackingData();
    }
  };

  const handlePause = () => {
    setIsTracking(false);
    setPauseTime(new Date().toISOString());
    saveTrackingData();
  };

  const handleEnd = () => {
    setIsTracking(false);
    const now = new Date();
    const elapsed =
      startTime !== "N/A"
        ? (new Date(now).getTime() - new Date(startTime as string).getTime()) /
          1000
        : 0;
    setEndTime(now.toISOString());
    setElapsedTime(elapsed);
    saveTrackingData();
  };

  // function to format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handlePress = async () => {
    try {
      const rate = parseFloat(hourlyRate);
      if (!isNaN(rate)) {
        setSavedHourlyRate(rate);
        setHourlyRate("");

        const projectDocRef = doc(
          FIREBASE_FIRESTORE,
          "Services",
          "AczkjyWoOxdPAIRVxjy3",
          "Projects",
          projectsId
        );

        await updateDoc(projectDocRef, {
          hourlyRate: rate,
        });
      } else {
        console.error("Invalid hourly rate:", hourlyRate);
      }
    } catch (error) {
      console.error("Error saving hourly rate:", error);
    }
  };

  const data = [
    {
      name: "Erreichte Stunden",
      hours: elapsedTime / 3600,
      color: "#77D353",
      legendFontColor: "#7F7F7F",
      legendFontSize: 15,
    },
    {
      name: "Verbleibende Stunden",
      hours: (project ? project.plannedHours : 0) - elapsedTime / 3600,
      color: "#F6CE46",
      legendFontColor: "#7F7F7F",
      legendFontSize: 15,
    },
  ];

  return (
    <ScrollView style={{ backgroundColor: "black" }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingBottom: 20,
        }}
      >
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: 80,
            backgroundColor: "transparent",
          }}
        >
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

          {/*
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-start",
                width: "100%",
              }}
            >
              
              <Text style={{ fontSize: 18, color: "black", marginBottom: 5 }}>
                Description: {project.description}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  color: "white",
                  marginBottom: 5,
                  flex: 1,
                  textAlign: "left",
                }}
              >
                Start Date: {project.startDate}
              </Text>
              <Text style={{ fontSize: 18, color: "black", marginBottom: 5 }}>
                Planned Hours per Week: {project.plannedHours}
              </Text>
            </View> */}
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

        <View
          style={{
            height: 400,
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
            Time Tracker
          </Text>

          <View
            style={{
              width: "80%",
              height: 100,
              backgroundColor: "#191919",
              borderColor: "aqua",
              borderRadius: 8,
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
              {formatElapsedTime(elapsedTime)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-evenly",
              alignItems: "center",
              marginBottom: 10,
              marginTop: 30,
              width: "100%",
            }}
          >
            <TouchableOpacity onPress={handlePause}>
              <FontAwesome6 name="pause" size={52} color="lightgrey" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleStart}>
              <FontAwesome5 name="play" size={85} color="lightgrey" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEnd}>
              <FontAwesome5 name="stop" size={52} color="lightgrey" />
            </TouchableOpacity>
          </View>

          <View
            style={{
              width: "100%",
              height: 80,
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
              <Text style={{ color: "grey" }}>Last Session:</Text>{" "}
              {endTime ? new Date(endTime).toLocaleString() : "N/A"}
            </Text>
            <Text
              style={{
                fontFamily: "MPLUSLatin_Bold",
                fontSize: 16,
                color: "white",
                marginBottom: 5,
              }}
            >
              <Text style={{ color: "grey" }}>Tracking Started:</Text>{" "}
              {startTime ? new Date(startTime).toLocaleString() : "N/A"}
            </Text>
          </View>
        </View>

        <View
          style={{
            marginBottom: 20,
            backgroundColor: "#191919",
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "aqua",
            padding: 20,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "MPLUSLatin_Bold",
              fontSize: 25,
              color: "white",
              marginBottom: 50,
              textAlign: "center",
            }}
          >
            Price Orientation
          </Text>
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
              placeholder="Hourly Rate"
              placeholderTextColor="grey"
              value={hourlyRate}
              onChangeText={setHourlyRate}
              keyboardType="numeric"
              style={{
                marginBottom: 10,
                height: 40,
                paddingHorizontal: 10,
                fontSize: 22,
              }}
            />
          </View>
          <TouchableOpacity
            onPress={handlePress}
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
                  fontSize: 20,
                  color: "grey",
                  marginBottom: 5,
                }}
              >
                Save Hourly Rate
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <View
            style={{
              width: "100%",
              height: 80,
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
              <Text style={{ color: "grey" }}>Total Hours:</Text>{" "}
              {(elapsedTime / 3600).toFixed(2)}
            </Text>
            <Text
              style={{
                fontFamily: "MPLUSLatin_Bold",
                fontSize: 16,
                color: "white",
                marginBottom: 5,
              }}
            >
              <Text style={{ color: "grey" }}>Total Earnings:</Text>{" "}
              {totalEarnings.toFixed(2)}
            </Text>
          </View>
        </View>

        <View
          style={{
            marginBottom: 20,
            backgroundColor: "#191919",
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "aqua",
            padding: 5,
          }}
        >
          <Text
            style={{
              fontFamily: "MPLUSLatin_Bold",
              fontSize: 25,
              color: "white",
              marginBottom: 10,
            }}
          >
            Success Chart
          </Text>
          <PieChart
            data={data}
            width={Dimensions.get("window").width}
            height={160}
            chartConfig={{
              backgroundGradientFrom: "#1E2923",
              backgroundGradientTo: "#08130D",
              color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
              strokeWidth: 2,
              barPercentage: 0.5,
              useShadowColorFromDataset: false,
            }}
            accessor="hours"
            backgroundColor="red"
            paddingLeft="15"
            absolute
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default DetailsScreen;
function saveTrackingData() {
  throw new Error("Function not implemented.");
}
