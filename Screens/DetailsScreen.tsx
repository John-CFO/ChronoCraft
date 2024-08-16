///////////////////////////////////// DetailsScreen Component////////////////////////////////////////////

import {
  View,
  Text,
  ScrollView,
  Dimensions,
  AppState,
  AppStateStatus,
  ActivityIndicator,
  FlatList,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { getDoc, doc, updateDoc, DocumentData } from "firebase/firestore";
import { User as User } from "firebase/auth";
import { StackNavigationProp } from "@react-navigation/stack";
import { PieChart } from "react-native-chart-kit";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Color } from "react-native-alert-notification/lib/typescript/service";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import DetailsProjectCard from "../components/DetailsProjectCard";
import TimeTrackerCard from "../components/TimeTrackerCard";
import EarningsCalculatorCard from "../components/EarningsCalculatorCard";
import { fetchProjectData } from "../components/services/ChartDataService";
import { getChartData } from "../components/PieChartProgressUtils";
import NoteModal from "../components/NoteModal";
import { useStore } from "../components/TimeTrackingState";
import DigitalClock from "../components/DigitalClock";
//import { useAppState } from "../AppStateStore";

//////////////////////////////////////////////////////////////////////////////////////////////////////

/*interface DetailsScreenProps {
  route: RouteProp<RootStackParamList, "Details">;
  navigation: StackNavigationProp<RootStackParamList, "Details">;
  projectId: string;
} */

type DetailsScreenRouteProp = RouteProp<RootStackParamList, "Details">;

type RootStackParamList = {
  Home: undefined;
  Details: { projectId: string; projectName: string };
};

interface ChartData {
  name: string;
  hours: number;
  color: string;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////

const DetailsScreen: React.FC = () => {
  const route = useRoute<DetailsScreenRouteProp>();
  const navigation = useNavigation();
  const { projectId = "No ID received", projectName = "No Name received" } =
    route.params || {};
  const { setProjectId } = useStore();

  useEffect(() => {
    setProjectId(projectId);
  }, [projectId, setProjectId]);

  // const [project, setProject] = useState<any>(null);
  // console.log("Project ID:", projectsId);
  // console.log("Project Name:", projectName);

  const [hourlyRate, setHourlyRate] = useState<string>("0.00");
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  //const { projectData, updateElapsedTime } = useAppState();
  // const [appState, setAppState] = useState(AppState.currentState);

  const [projectData, setProjectData] = useState<DocumentData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjectData = async (projectId: string) => {
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
        return docSnap.data();
      } else {
        console.warn("No such document for projectId:", projectId);
        return null;
      }
    } catch (error) {
      console.error("Error fetching project data:", error);
      throw error; // optional, to handle it where the function is called
    }
  };

  /*useEffect(() => {
    const fetchProject = async () => {
      try {
        const docRef = doc(
          FIREBASE_FIRESTORE,
          "Services",
          "AczkjyWoOxdPAIRVxjy3",
          "Projects",
          projectsId
        );
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProject(docSnap.data());
          setHourlyRate(docSnap.data().hourlyRate.toString());
          setTotalEarnings(docSnap.data().totalEarnings || 0);
        } else {
          console.warn("No such document!");
        }
      } catch (error) {
        console.error("Error fetching project: ", error);
      }
    };

    fetchProject();
  }, [projectsId]); */

  /* const saveTrackingData = async (
    startTime: string | null,
    endTime: string | null,
    elapsedTime: number,
    isTracking: boolean
  ) => {
    try {
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
        elapsedTime,
        totalEarnings,
        hourlyRate: parseFloat(hourlyRate),
        isTracking,
      });
      console.log("Tracking data saved successfully");
    } catch (error) {
      console.error("Error saving tracking data:", error);
    }
  };

  const formatElapsedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }; */

  /*useEffect(() => {
    const loadData = async () => {
      const projectData = await fetchProjectData(projectId);
      if (projectData) {
        setChartData(getChartData(projectData));
      }
    };

    loadData();
  }, [projectId]); */

  /*
  // function to show the chart-data
  useEffect(() => {
    const loadData = async () => {
      if (!projectsId || projectsId === "No ID received") {
        console.warn("Project ID is not defined");
        return;
      }
      console.log("Loading data for Project ID:", projectsId);

      try {
        const data = await fetchProjectData(projectsId);
        if (data) {
          setProjectData(data);
          setChartData(getChartData(data));
        }
      } catch (error) {
        console.error("Error loading project data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectsId]);  */

  /*useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isTracking && startTime !== "N/A" && startTime !== null) {
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
          totalEarnings,
          hourlyRate: parseFloat(hourlyRate),
        });
        console.log("Tracking data saved successfully");
      } else {
        console.log("Cannot save tracking data: startTime is not initialized");
      }
    } catch (error) {
      console.error("Error saving tracking data:", error);
    }
  }; */

  /*
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
  }; */

  /*useEffect(() => {
    const fetchProject = async () => {
      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "Projects",
        projectsId
      );

      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProject(docSnap.data());
        setElapsedTime(docSnap.data().elapsedTime || 0);
      }
    };

    fetchProject();
  }, [projectsId]); */

  /* const data = [
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
  ];  */

  /*
  // loading indicator when data is loading from firebase
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "black",
        }}
      >
        <ActivityIndicator size="large" color="#00ff00" />
      </View>
    );
  }

  console.log("Rendering component with chartData:", chartData);
*/

  return (
    <ScrollView style={{ backgroundColor: "black" }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 20 }}>
        {/* Project-Card */}
        <DetailsProjectCard />
        {/* Time-Tracker */}
        <TimeTrackerCard />
        {/* Earn-Calculator-Card */}
        <EarningsCalculatorCard />
        <Text style={{ color: "white" }}>
          Project ID: {projectId ? projectId : "No ID received"}
        </Text>
        <Text style={{ color: "white" }}>Project Name: {projectName}</Text>

        {/* Success Chart */}
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
            data={chartData}
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
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
        {/* Success Chart */}
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
            Your Notes from {projectName}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default DetailsScreen;
