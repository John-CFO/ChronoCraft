///////////////////////////////////// DetailsScreen Component////////////////////////////////////////////

// This component shows the project details in the DetailsScreen.
// It includes the project details card, time tracker card, earnings calculator card success chart and the project notes.

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
import {
  getDoc,
  updateDoc,
  DocumentData,
  query,
  getDocs,
  collection,
} from "firebase/firestore";
import { User as User } from "firebase/auth";
import { StackNavigationProp } from "@react-navigation/stack";
import { PieChart } from "react-native-chart-kit";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Color } from "react-native-alert-notification/lib/typescript/service";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import DetailsProjectCard from "../components/DetailsProjectCard";
import TimeTrackerCard from "../components/TimeTrackerCard";
import EarningsCalculatorCard from "../components/EarningsCalculatorCard";
import { fetchProjectData } from "../components/services/ChartDataService";
import { getChartData } from "../components/PieChartProgressUtils";
import NoteModal from "../components/NoteModal";
import NoteList from "../components/NoteList";
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

interface Note {
  id: string;
  comment: string;
  createdAt: Date;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////

const DetailsScreen: React.FC = () => {
  const route = useRoute<DetailsScreenRouteProp>();
  const navigation = useNavigation();
  const { projectId = "No ID received" } = route.params || {};
  const { setProjectId } = useStore();

  // states to manage the NoteCard Value fetching
  const [note, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setProjectId(projectId);
  }, [projectId, setProjectId]);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const notesQuery = query(
          collection(
            FIREBASE_FIRESTORE,
            `Services/AczkjyWoOxdPAIRVxjy3/Projects/${projectId}/Notes`
          )
        );
        const notesSnapshot = await getDocs(notesQuery);

        if (!notesSnapshot.empty) {
          const fetchedNotes: Note[] = notesSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              comment: data.comment,
              createdAt: data.createdAt.toDate(),
            };
          });
          setNotes(fetchedNotes);
        } else {
          console.log("No notes found for this project.");
        }
      } catch (error) {
        console.error("Error fetching notes: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [projectId]);

  // const [project, setProject] = useState<any>(null);
  // console.log("Project ID:", projectsId);
  // console.log("Project Name:", projectName);

  //const [hourlyRate, setHourlyRate] = useState<string>("0.00");
  //const [totalEarnings, setTotalEarnings] = useState<number>(0);
  //const { projectData, updateElapsedTime } = useAppState();
  // const [appState, setAppState] = useState(AppState.currentState);

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

        {/* Success Chart */}

        {/* Notes Card */}
        <NoteList projectId={projectId} />
      </View>
    </ScrollView>
  );
};

export default DetailsScreen;
