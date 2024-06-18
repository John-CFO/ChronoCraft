import { View, Text, TextInput, Button, TouchableOpacity } from "react-native";
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
import { AntDesign } from "@expo/vector-icons";

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
    <View style={{ flex: 1, width: "100%", backgroundColor: "black" }}>
      <View
        style={{
          width: "100%",
          height: 50,
          marginBottom: 20,
          backgroundColor: "transparent",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "MPLUSLatin_Bold",
            fontSize: 25,
            color: "white",
          }}
        >
          - Project Tracking -
        </Text>
      </View>
    </View>
  );
};

export default DetailsScreen;
