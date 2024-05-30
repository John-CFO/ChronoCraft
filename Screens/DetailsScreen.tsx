import { View, Text, TextInput, Button } from "react-native";
import React, { useState } from "react";
import { FIREBASE_APP, FIREBASE_FIRESTORE } from "../firebaseConfig";
import {
  getFirestore,
  collection,
  DocumentData,
  CollectionReference,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";

interface DetailsScreenProps {
  route: RouteProp<RootStackParamList, "Details"> & {
    params: {
      projectsId: string;
    };
  };
  navigation: StackNavigationProp<RootStackParamList, "Details">;
}

type RootStackParamList = {
  Home: undefined;
  Details: { projectsId: string };
};

const DetailsScreen: React.FC<DetailsScreenProps> = ({ route, navigation }) => {
  const { projectsId } = route.params;

  const getProjectNotes = async (projectId: string) => {
    try {
      const db = FIREBASE_FIRESTORE;
      const projectRef = doc(db, "projects", projectId);
      const projectNotesRef = collection(projectRef, "notes");
      const querySnapshot = await getDocs(projectNotesRef);
      const notes = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return notes;
    } catch (error) {
      console.error("Error getting project notes:", error);
      return [];
    }
  };

  return (
    <View>
      <Text>Details</Text>
    </View>
  );
};

export default DetailsScreen;
