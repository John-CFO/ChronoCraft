//////////////////////////////////////////// Earnings Calculator Card Component //////////////////////////////////

// this component is used to show the earnings calculator card in the details screen
// the user can set the hourly rate and the component will calculate the earnings based on the time tracked by the time tracker card
// it used ProjectContext.tsx to get the project id to save the background task and let the Tracker work in the background

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import React, { useEffect, useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { CopilotStep, walkthroughable } from "react-native-copilot";
import { useTranslation } from "react-i18next";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";
import { updateProjectData } from "../components/FirestoreService";
import { useService } from "../components/contexts/ServiceContext";
import { useStore } from "./TimeTrackingState";
import { useAlertStore } from "../components/services/customAlert/alertStore";
import { sanitizeRateInput } from "./InputSanitizers";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { HourlyRateSchema } from "../validation/earningsSchemas";
import { logError } from "../lib/loggerClient";

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

type RootStackParamList = {
  Details: { projectId: string };
};

export type EarningsCalculatorCardProp = RouteProp<
  RootStackParamList,
  "Details"
>;

interface EarningsCalculatorCardProps {
  projectId: string;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

// modified walkthroughable for copilot tour
const CopilotWalkthroughView = walkthroughable(View);

const EarningsCalculatorCard: React.FC<EarningsCalculatorCardProps> = ({
  projectId,
}) => {
  // useTranslation hook to access translations
  const { t } = useTranslation();

  // navigation
  const navigation = useNavigation();
  const { serviceId } = useService();

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  // constants for validation
  const MAX_HOURLY_RATE = 1000;
  const MIN_HOURLY_RATE = 0;

  // global state
  const { setHourlyRate } = useStore();
  const hourlyRate = useStore(
    (state) => state.projects[projectId]?.hourlyRate || 0,
  );
  const totalEarnings = useStore(
    (state) => state.projects[projectId]?.totalEarnings || 0,
  );

  // initialize local hourly rate to save the state when user navigates away from the screen
  const [rateInput, setRateInput] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // function to fetch data from firestore if user navigate to details screen
  const fetchEarningsData = useCallback(async () => {
    if (!serviceId) return;
    const user = FIREBASE_AUTH.currentUser;
    if (!user || !projectId) return;

    try {
      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        user.uid,
        "Services",
        serviceId,
        "Projects",
        projectId,
      );

      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;

      const data = docSnap.data();

      // hourlyRate: validate client input
      const raw = data.hourlyRate;

      let hourlyRate: number | null = null;

      if (raw === undefined || raw === null) {
        hourlyRate = null;
      } else if (typeof raw === "number" && raw >= 0 && raw <= 10000) {
        hourlyRate = raw;
      } else {
        logError(
          "EarningsCalculatorCard/invalidHourlyRate",
          new Error("Corrupted hourlyRate value"),
        );
        hourlyRate = null;
      }

      // totalEarnings: adopt directly, fallback 0
      const totalEarnings =
        typeof data.totalEarnings === "number" ? data.totalEarnings : 0;

      setHourlyRate(projectId, hourlyRate ?? 0);
      useStore.getState().setTotalEarnings(projectId, totalEarnings);
    } catch (error) {
      logError("EarningsCalculatorCard/fetchEarningsData", error);
      // fail safe
      setHourlyRate(projectId, 0);
      useStore.getState().setTotalEarnings(projectId, 0);
    }
  }, [projectId, setHourlyRate, serviceId]);

  // hook to load by mount
  useEffect(() => {
    fetchEarningsData();
  }, [fetchEarningsData]);

  // hook to load by mount
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setRateInput("");
    });
    return unsubscribe;
  }, [navigation]);

  // function to handle rate change
  const handleRateChange = (text: string) => {
    setRateInput(text);
  };

  // function to handle save
  const handleSave = async () => {
    const user = FIREBASE_AUTH.currentUser;
    if (!user) {
      useAlertStore
        .getState()
        .showAlert(
          t("earningsCalculator.alerts.error"),
          t("earningsCalculator.alerts.authenticationRequired"),
        );
      return;
    }

    // input validation
    const rate = parseFloat(rateInput);
    const inputValidation = HourlyRateSchema.safeParse({
      hourlyRate: rate,
      projectId,
      userId: user.uid,
    });

    if (!inputValidation.success) {
      const errorMessage =
        inputValidation.error.issues[0]?.message || "Invalid input";
      useAlertStore
        .getState()
        .showAlert(t("earningsCalculator.alerts.invalidInput"), errorMessage);
      return;
    }

    // logic validation
    if (rate < MIN_HOURLY_RATE || rate > MAX_HOURLY_RATE) {
      useAlertStore.getState().showAlert(
        t("earningsCalculator.alerts.invalidRate"),
        t("earningsCalculator.alerts.rateRange", {
          min: MIN_HOURLY_RATE,
          max: MAX_HOURLY_RATE,
        }),
      );
      return;
    }
    setSaving(true);
    try {
      if (!serviceId) {
        logError(
          "EarningsCalculatorCard/missingServiceId",
          new Error("serviceId is missing"),
        );
        return;
      }

      await updateProjectData(projectId, serviceId, { hourlyRate: rate });
      setHourlyRate(projectId, rate);
      setRateInput("");
    } catch (error) {
      logError("EarningsCalculatorCard/saveHourlyRate", error);
      useAlertStore
        .getState()
        .showAlert(
          t("earningsCalculator.alerts.error"),
          t("earningsCalculator.alerts.saveFailed"),
        );
    }
    setSaving(false);
  };

  return (
    <View>
      {/* DetailsScreen copilot tour step 3 */}
      <CopilotStep
        name="Earnings-Calculator"
        order={3}
        text={t("details.earningsCalculator.tourText")}
      >
        {/* Earnings Calculator Card */}
        <CopilotWalkthroughView
          accessible={true}
          accessibilityLabel={t(
            "details.earningsCalculator.accessibilityLabel",
            {
              totalEarnings: Number(totalEarnings || 0).toFixed(2),
              hourlyRate: hourlyRate || t("details.earningsCalculator.notSet"),
            },
          )}
          style={{
            height: 420,
            marginBottom: 20,
            backgroundColor: "#191919",
            borderWidth: 1,
            borderColor: "aqua",
            borderRadius: 8,
            padding: 20,
            alignItems: "center",
          }}
        >
          {/* title */}
          <Text
            accessible={false}
            accessibilityRole="header"
            style={{
              fontFamily: "MPLUSLatin_Bold",
              fontSize: accessMode ? 28 : 25,
              color: "white",
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            {t("details.earningsCalculator.title")}
          </Text>
          {/* Total Earnings viewport */}
          <View
            accessible={true}
            accessibilityLabel={t("details.earningsCalculator.totalEarnings", {
              amount: Number(totalEarnings || 0).toFixed(2),
            })}
            style={{
              width: "80%",
              height: 100,
              backgroundColor: "#191919",
              borderColor: "aqua",
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
              {/*the Number wrapper converts the totalEarnings into a Number to format it into a string with toFixed(2). 
            this is important to display the totalEarnings in the correct format to lively tracking the earnings*/}
              ${Number(totalEarnings || 0).toFixed(2)}
            </Text>
          </View>
          {/* Hourly Rate TextInput field*/}
          <View
            style={{
              marginTop: accessMode ? 25 : 30,
              width: "100%",
              backgroundColor: "#191919",
              alignItems: "center",
            }}
          >
            <TextInput
              accessible={true}
              accessibilityLabel={t(
                "details.earningsCalculator.hourlyRateInput",
              )}
              placeholder={t("details.earningsCalculator.hourlyRateInput")}
              placeholderTextColor={accessMode ? "white" : "grey"}
              keyboardType="numeric"
              value={rateInput}
              onChangeText={(text) => handleRateChange(sanitizeRateInput(text))}
              style={{
                marginBottom: 15,
                width: screenWidth * 0.7, // use 70% of the screen width
                maxWidth: 400,
                borderColor: "aqua",
                borderWidth: 1.5,
                borderRadius: 12,
                paddingLeft: 15,
                paddingRight: 40,
                paddingBottom: 5,
                fontSize: 22,
                height: 50,
                color: "white",
                backgroundColor: "black",
              }}
            />

            {/* Save button */}
            <TouchableOpacity
              accessible={true}
              accessibilityLabel={
                saving
                  ? t("details.earningsCalculator.savingHourlyRate")
                  : t("details.earningsCalculator.saveHourlyRate")
              }
              onPress={handleSave}
              style={{
                width: screenWidth * 0.7, // use 70% of the screen width
                maxWidth: 400,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: saving ? "lightgray" : "aqua",
                marginBottom: 30,
              }}
            >
              <LinearGradient
                colors={["#00f7f7", "#005757"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: 45,
                  paddingVertical: 6,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "MPLUSLatin_Bold",
                    fontSize: 22,
                    color: saving ? "lightgray" : "white",
                    paddingRight: 10,
                  }}
                >
                  {saving
                    ? t("details.earningsCalculator.saving")
                    : t("details.earningsCalculator.save")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            {/* Hourly Rate info container */}
            <View
              accessible={true}
              accessibilityLabel={
                hourlyRate
                  ? t("details.earningsCalculator.currentHourlyRate", {
                      hourlyRate,
                    })
                  : t("details.earningsCalculator.noHourlyRate")
              }
              style={{
                width: "100%",
                height: 50,
                alignItems: "flex-start",
                justifyContent: "center",
                paddingLeft: 10,
                borderRadius: 10,
                //shadow options for android
                shadowColor: "#ffffff",
                elevation: 2,
                //shadow options for ios
                shadowOffset: { width: 2, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
                backgroundColor: "#191919",
              }}
            >
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: "bold",
                  color: "white",
                  marginBottom: 5,
                }}
              >
                <Text
                  style={{
                    color: accessMode ? "white" : "grey",
                    fontSize: 16,
                    fontFamily: "MPLUSLatin_Bold",
                  }}
                >
                  {t("details.earningsCalculator.yourHourlyRate")}:{" "}
                </Text>
                {hourlyRate}
              </Text>
            </View>
          </View>
        </CopilotWalkthroughView>
      </CopilotStep>
    </View>
  );
};

export default EarningsCalculatorCard;
