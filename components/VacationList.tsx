/////////////////////////////////////////VacationList Component////////////////////////////////////////

import { View, Text, FlatList } from "react-native";
import React, { useEffect, useState } from "react";
//import { firebase } from "@react-native-firebase/firestore";
import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { TouchableOpacity, TextInput } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { collection, getDocs } from "firebase/firestore";

///////////////////////////////////////////////////////////////////////////////////////////////////////

const VacationList = () => {
  //set state for vacations
  const [vacations, setVacations] = useState<
    { id: string; name: string; status: string }[]
  >([]);

  //effect hook to get the data from firestore with fetch
  useEffect(() => {
    const fetchData = async () => {
      //const db = firebase.firestore();
      const db = FIREBASE_FIRESTORE;
      const vacationsCollection = collection(db, "vacations");
      const vacationsSnapshot = await getDocs(vacationsCollection);

      const vacationsData = vacationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        status: doc.data().status,
      }));
      setVacations(vacationsData);
    };
    fetchData();
  }, []);

  //switch instruction to show the current state of bookings
  const getStatusText = (status: string) => {
    switch (status) {
      case "received":
        return "Request received";
      case "failed":
        return "Request failed";
      case "approved":
        return "Request approved";
      case "pending":
        return "Request pending";
      default:
        return "Unknown Status";
    }
  };

  return (
    //vacation list container
    <View style={{ backgroundColor: "black" }}>
      <View
        style={{
          width: 420,
          height: 80,
          backgroundColor: "black",
          justifyContent: "center",
          alignItems: "center",
        }}
      ></View>

      <View
        style={{
          width: 420,
          height: 80,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* title */}
        <Text
          style={{
            fontSize: 22,
            fontFamily: "MPLUSLatin_Regular",
            color: "white",
          }}
        >
          Booked Vacations
        </Text>
      </View>
      <View
        style={{ width: 420, justifyContent: "center", alignItems: "center" }}
      >
        {vacations.length > 0 ? (
          // if something is booked render the list
          <FlatList
            style={{
              width: 380,
              borderRadius: 8,
              borderColor: "aqua",
              borderWidth: 2,
            }}
            data={vacations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Text
                key={item.id}
                style={{
                  fontFamily: "MPLUSLatin_Regular",
                  color: "white",
                  fontSize: 16,
                }}
              >
                {item.name} - Status: {getStatusText(item.status)}
              </Text>
            )}
          />
        ) : (
          // if nothing is booked
          <View style={{ width: 330, height: 50, alignItems: "center" }}>
            <Text
              style={{
                textAlign: "center",
                color: "white",
                fontSize: 18,
                fontFamily: "MPLUSLatin_ExtraLight",
              }}
            >
              You haven't booked any vacation days yet. Book some.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default VacationList;
