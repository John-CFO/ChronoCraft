/////////////////////////////////////////VacationList Component////////////////////////////////////////

import { View, Text, FlatList } from "react-native";
import React, { useEffect, useState } from "react";
import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { TouchableOpacity } from "react-native-gesture-handler";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { AntDesign } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { Alert } from "react-native";

///////////////////////////////////////////////////////////////////////////////////////////////////////

const VacationList = () => {
  //set state for vacations
  const [vacations, setVacations] = useState<
    { id: string; markedDates: string[] }[]
  >([]);

  // effect hook to get the data from firestore with snapshot
  useEffect(() => {
    const vacationsCollection = collection(
      FIREBASE_FIRESTORE,
      "Services",
      "AczkjyWoOxdPAIRVxjy3",
      "Vacations"
    );

    const unsubscribe = onSnapshot(vacationsCollection, (snapshot) => {
      const vacationsData = snapshot.docs.map((doc) => {
        const data = doc.data();

        // extract the key from the markedDates object to get the array of dates
        const markedDatesArray = data.markedDates
          ? Object.keys(data.markedDates)
          : [];

        // console.log("Converted markedDates:", markedDatesArray);

        return {
          id: doc.id,
          markedDates: markedDatesArray,
        };
      });

      // sort the vacations by the first marked date
      vacationsData.sort((a, b) => {
        if (a.markedDates.length === 0 || b.markedDates.length === 0) return 0;
        return (
          new Date(a.markedDates[0]).getTime() -
          new Date(b.markedDates[0]).getTime()
        );
      });

      // console.log("Vacations Data:", vacationsData);
      setVacations(vacationsData);
    });

    return () => unsubscribe();
  }, []);

  // function to delete vacation dates
  const handleDeleteDate = async (id: string) => {
    // alert to confirm deletion
    Alert.alert("Attention!", "Do you really want to delete the vacation?", [
      {
        text: "Cancel",
        onPress: () => console.log("Vacation deletion canceled"),
        style: "cancel",
      },
      {
        text: "Delete",
        onPress: async () => {
          try {
            const vacationDoc = doc(
              FIREBASE_FIRESTORE,
              "Services",
              "AczkjyWoOxdPAIRVxjy3",
              "Vacations",
              id
            );

            await deleteDoc(vacationDoc);

            // console.log(`Vacation with ID ${id} deleted successfully.`);
          } catch (error) {
            console.error("Error deleting vacation:", error);
          }
        },
        style: "destructive", // to visually indicate a destructive action
      },
    ]);
  };

  return (
    // vacation list container
    <View
      style={{
        width: "95%",
        minHeight: 200,
        marginTop: 20,
        marginBottom: 20,
        padding: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "aqua",
        backgroundColor: "#191919",
      }}
    >
      <View
        style={{
          width: "auto",
          height: 10,
          justifyContent: "center",
          alignItems: "center",
        }}
      ></View>

      <View
        style={{
          width: "auto",
          height: 80,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* title */}
        <Text
          style={{
            fontSize: 25,
            fontFamily: "MPLUSLatin_Bold",
            color: "white",
          }}
        >
          Booked Vacations
        </Text>
      </View>
      <View
        style={{
          width: "auto",
          marginTop: 20,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {vacations.length > 0 ? (
          // if something is booked render the list
          <FlatList
            contentContainerStyle={{ paddingBottom: 20 }}
            data={vacations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const sortedDates = item.markedDates
                .map((date) => {
                  const [year, month, day] = date.split("-");

                  // parseInt is used to convert the string to a number to sort the dates list
                  return {
                    formatted: `${parseInt(day, 10)}.${parseInt(month, 10)}.${year}`,
                    timestamp: new Date(
                      parseInt(year, 10),
                      parseInt(month, 10) - 1, // -1 because months are zero-based
                      parseInt(day, 10)
                    ),
                  };
                })
                .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); // sort by timestamp

              // extract the first and last date to show a range in the UI
              const displayRange =
                sortedDates.length > 1
                  ? `${sortedDates[0].formatted} - ${sortedDates[sortedDates.length - 1].formatted}`
                  : sortedDates[0]?.formatted;

              return (
                <View
                  style={{
                    height: 60,
                    width: 360,
                    flexDirection: "row",
                    justifyContent: "space-around",
                    paddingTop: 15,
                    paddingLeft: 10,
                    borderRadius: 10,
                    backgroundColor: "#191919",
                    padding: 8,
                    margin: 10,
                    //shadow options for android
                    shadowColor: "#ffffff",
                    elevation: 2,
                    //shadow options for ios
                    shadowOffset: { width: 2, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 3,
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
                    <Text
                      style={{
                        color: "grey",
                        fontFamily: "MPLUSLatin_Bold",
                        fontSize: 16,
                      }}
                    >
                      Date:
                    </Text>{" "}
                    {displayRange || "No marked dates"}
                  </Text>
                  <TouchableOpacity>
                    <MaterialIcons
                      name="edit-note"
                      size={30}
                      color="darkgrey"
                    />
                    {/*vacation delete button */}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteDate(item.id)}>
                    <AntDesign name="delete" size={30} color="darkgrey" />
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        ) : (
          // if nothing is booked
          <View
            style={{
              width: 330,
              height: 50,
              alignItems: "center",
            }}
          >
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
