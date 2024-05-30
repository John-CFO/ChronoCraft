import { View } from "react-native";
import React from "react";
import * as Yup from "yup";
import { Formik, Field } from "formik";
import { TextInput } from "react-native-gesture-handler";
//import { Calendar } from "react-native-calendars";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";

///////////////////////////////////////////////////////////////////////////////

interface ReservationFormValues {
  startDate: string;
  endDate: string;
  //miniCalendar: "startDate" | "endDate" | null;
}

///////////////////////////////////////////////////////////////////////////////

//Yup Schema for validation
const reservationSchema = Yup.object().shape({
  startDate: Yup.date().required("Start date is required"),
  endDate: Yup.date().required("End date is required"),
});

const VacationForm = () => {
  const handleReserve = (values: ReservationFormValues) => {
    // Hier können Sie die Daten an Firebase Firestore übergeben
    console.log("Reserving:", values);
    // Fügen Sie hier Ihre Firestore-Logik hinzu
  };

  return (
    <Formik
      validationSchema={reservationSchema}
      onSubmit={handleReserve}
      initialValues={{ startDate: "", endDate: "" }}
    >
      {({ handleChange, handleSubmit, values, setFieldValue, errors }) => (
        <View
          style={{
            paddingTop: 15,
            alignItems: "center",
            borderTopColor: "grey",
            borderWidth: 0.5,
            backgroundColor: "black",
            width: "100%",
            height: 80,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View style={{ paddingHorizontal: 10 }}>
              <MaterialCommunityIcons
                name="calendar-text"
                size={40}
                color="white"
              />
            </View>

            {/*imput field "start date" */}
            <Field name="startDate">
              {() => (
                <View
                  style={{
                    margin: 5,
                    backgroundColor: "lightgrey",
                    width: 130,
                    height: 50,
                    borderWidth: 2,
                    borderColor: "white",
                    borderRadius: 8,
                  }}
                >
                  <TextInput
                    style={{
                      width: 250,
                      height: 40,
                      paddingLeft: 10,
                      fontSize: 22,
                      color: "aqua",
                    }}
                    placeholder="Start Date"
                    placeholderTextColor="grey"
                    editable={false}
                    value={values.startDate}
                    onChangeText={handleChange("startDate")}
                  />
                </View>
              )}
            </Field>
            <View style={{ paddingHorizontal: 10 }}>
              <FontAwesome name="arrow-circle-right" size={40} color="white" />
            </View>

            {/*imput field "end date" */}
            <Field name="endDate">
              {() => (
                <View
                  style={{
                    margin: 5,
                    backgroundColor: "lightgrey",
                    width: 130,
                    height: 50,
                    borderWidth: 3,
                    borderColor: "white",
                    borderRadius: 8,
                  }}
                >
                  <TextInput
                    style={{
                      width: 250,
                      height: 40,
                      paddingLeft: 10,
                      fontSize: 22,
                    }}
                    placeholder="End Date"
                    placeholderTextColor="grey"
                    editable={false}
                    value={values.endDate}
                    onChangeText={handleChange("endDate")}
                  />
                </View>
              )}
            </Field>
          </View>
        </View>
      )}
    </Formik>
  );
};

export default VacationForm;
