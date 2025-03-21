///////////////////////////////////// DetailsScreen Component////////////////////////////////////////////

// This component shows the project details in the DetailsScreen.
// It includes the project details card, time tracker card, earnings calculator card success chart and the project notes.

/////////////////////////////////////////////////////////////////////////////////////////////////////////

import { View, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import { query, getDocs, collection } from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import DetailsProjectCard from "../components/DetailsProjectCard";
import TimeTrackerCard from "../components/TimeTrackerCard";
import EarningsCalculatorCard from "../components/EarningsCalculatorCard";
import NoteList from "../components/NoteList";
import { useStore } from "../components/TimeTrackingState";
import { EarningsCalculatorCardProp } from "../components/EarningsCalculatorCard";
import RoutingLoader from "../components/RoutingLoader";
import ErrorBoundary from "../components/ErrorBoundary";

//////////////////////////////////////////////////////////////////////////////////////////////////////

type DetailsScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, "Details">;
  route: RouteProp<RootStackParamList, "Details"> | EarningsCalculatorCardProp;
};

type DetailsScreenRouteProp = RouteProp<RootStackParamList, "Details">;

type RootStackParamList = {
  Home: undefined;
  Details: {
    projectId: string;
    projectName: string;
    userId?: string;
    serviceId?: string;
  };
};

interface Note {
  id: string;
  comment: string;
  createdAt: Date;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////

const DetailsScreen: React.FC<DetailsScreenProps> = () => {
  // navigation
  const route = useRoute<DetailsScreenRouteProp>();
  const navigation = useNavigation();

  // initialize the states from TimeTrackingState
  const {
    projectId = "No ID received",
    userId = "No User ID",
    serviceId = "No Service ID",
  } = route.params || {};
  const { setProjectId } = useStore();

  // states to manage the NoteCard Value fetching
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // state to manage the loading Indicator time
  const [minTimePassed, setMinTimePassed] = useState(false);

  // hook to set the projectId
  useEffect(() => {
    setProjectId(projectId);
  }, [projectId, setProjectId]);

  // hook to fetch the notes from Firestore with snapshot
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const notesQuery = query(
          collection(
            FIREBASE_FIRESTORE,
            `Users/${userId}/Services/${serviceId}/Projects/${projectId}/Notes`
          )
        );
        const notesSnapshot = await getDocs(notesQuery);
        // condition to check if notesSnapshot is empty, then setNotes([])
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
  }, [projectId, userId, serviceId]);

  // hook to manage the loading indicator time
  useEffect(() => {
    // set minTimePassed to true after 3 seconds
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && minTimePassed) {
      setLoading(false);
    }
  }, [loading, minTimePassed]);

  // loading indicator when data is loading from firebase
  if (loading || !minTimePassed) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "black",
        }}
      >
        <RoutingLoader />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: "black" }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 20 }}>
        {/* Project-Card */}
        <ErrorBoundary>
          <DetailsProjectCard />
        </ErrorBoundary>
        {/* Time-Tracker */}
        <ErrorBoundary>
          <TimeTrackerCard projectId={projectId} />
        </ErrorBoundary>
        {/* Earn-Calculator-Card */}
        <ErrorBoundary>
          <EarningsCalculatorCard
            route={route as EarningsCalculatorCardProp} // route is importent to fetch the earnings state from firestore when user navigate to details screen
            projectId={projectId}
          />
        </ErrorBoundary>
        {/* Success Chart */}
        {/* Notes Card */}
        <NoteList projectId={projectId} />
      </View>
    </ScrollView>
  );
};

export default DetailsScreen;
