///////////////////////////////////////VacationScreen//////////////////////////////////////////////

import { View, Text, FlatList } from "react-native";
import React, { useEffect, useState, useCallback } from "react";
import { TouchableOpacity, TextInput } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";

import CustomCalendar from "../components/CustomCalendar";
import VacationForm from "../components/VacationForm";
import VacationList from "../components/VacationList";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";

//////////////////////////////////////////////////////////////////////////////////////////////////

function VacationScreen() {
  // state to handle the marked dates when select them
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
  // states to refresh the FlatList to show the updated data and current month
  const [refreshKey, setRefreshKey] = useState(0);
  const isFocused = useIsFocused();

  // states to show the current month
  const [currentMonth, setCurrentMonth] = useState(
    new Date().toISOString().split("T")[0]
  );

  // useFocusEffect to refresh the FlatList to show the updated data
  useFocusEffect(
    useCallback(() => {
      setRefreshKey((prevKey) => prevKey + 1);
    }, [])
  );

  useEffect(() => {
    if (isFocused) {
      // set the current month when render the screen
      setCurrentMonth(new Date().toISOString().split("T")[0]);
    }
  }, [isFocused]);

  return (
    <FlatList
      key={refreshKey} // key is important to refresh the FlatList
      ListHeaderComponent={
        <>
          <View
            style={{
              zIndex: +2,
              paddingTop: 10,
              alignItems: "center",
              backgroundColor: "black",
            }}
          >
            <Text
              style={{
                fontSize: 25,
                fontFamily: "MPLUSLatin_Bold",
                color: "white",
              }}
            >
              - Vacation Management -
            </Text>
            <View style={{ width: 420, height: 280, alignItems: "center" }}>
              <LottieView
                autoPlay
                loop
                style={{ height: 350, width: 350 }}
                source={require("../assets/Lottie_files/beach-hero.json")}
              />
            </View>
            <View
              style={{
                width: 420,
                height: 40,
                marginBottom: 15,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  zIndex: +2,
                  fontSize: 18,
                  fontFamily: "MPLUSLatin_ExtraLight",
                  color: "white",
                }}
              >
                "Unplug from work, recharge your soul"
              </Text>
            </View>
          </View>

          <View
            style={{
              width: 420,
              height: 360,
              backgroundColor: "black",
            }}
          >
            <CustomCalendar
              currentMonth={currentMonth}
              markedDates={markedDates}
            />
          </View>

          <View>
            <VacationForm />
          </View>
        </>
      }
      ListFooterComponent={
        <>
          <View
            style={{
              flex: 1,
              height: "10%",
              width: "100%",
              backgroundColor: "black",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <VacationList />
          </View>
        </>
      }
      data={[{ key: "dummy" }]}
      renderItem={() => null}
    />
  );
}

export default VacationScreen;
