///////////////////////////ProgressCard Component/////////////////////////////////////

// This component is used to display the progress of a project and to save the progress to the database
// The userr can also change the maxWorkHours and save them to the database

//////////////////////////////////////////////////////////////////////////////////////

import React, { memo, useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import CircularProgress from "react-native-circular-progress-indicator";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { CopilotStep, walkthroughable } from "react-native-copilot";
import { useTranslation } from "react-i18next";

import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useService } from "../components/contexts/ServiceContext";
import { useStore } from "./TimeTrackingState";
import { sanitizeMaxWorkHours } from "./InputSanitizers";
import useDebounceValue from "../hooks/useDebounceValue";
import { useDotAnimation } from "../components/DotAnimation";
import { NotificationManager } from "./services/PushNotifications";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { MaxWorkHoursSchema } from "../validation/progressSchemas";
import { useAlertStore } from "../components/services/customAlert/alertStore";
import { logError } from "../lib/loggerClient";

///////////////////////////////////////////////////////////////////////////////////////

interface ProgressCardProps {
  projectId: string;
  serviceId: string;
  maxHoursFromDB: number | null;
  onSaveSuccess?: () => void;
}

///////////////////////////////////////////////////////////////////////////////////////

// modified walkthroughable for copilot tour
const CopilotWalkthroughView = walkthroughable(View);

const ProgressCard: React.FC<ProgressCardProps> = memo(
  ({ projectId, onSaveSuccess }) => {
    // useTranslation hook to access translations
    const { t } = useTranslation();

    // initialize the navigation
    const navigation = useNavigation();
    const { serviceId } = useService();

    // state to handle the dot animation
    const [loading, setLoading] = useState(true);

    // define the dot animation with a delay
    const dots = useDotAnimation(loading, 700);

    // initialize the screensize
    const { width: screenWidth } = useWindowDimensions();

    // initialize the accessibility store
    const accessMode = useAccessibilityStore(
      (state) => state.accessibilityEnabled,
    );

    // get the project data from the store
    const { setProjectData } = useStore();

    // Ref for Notifications
    const hasNotifiedRef = useRef(false);

    // initialize the progress state
    const [displayProgress, setDisplayProgress] = useState(0);
    // initialize the progress refs
    const progressRef = useRef(0);

    // function to fetch the timer and maxWorkHours from the store
    const { timer, maxWorkHours } = useStore((state) => {
      const project = state.projects[projectId] || {};
      return {
        timer: project.timer || 0,
        maxWorkHours: project.maxWorkHours || 0,
      };
    });

    // hook to update the progress state every 5 seconds
    useEffect(() => {
      const interval = setInterval(() => {
        const { projects } = useStore.getState();
        const project = projects[projectId];
        if (!project) return;

        const currentTimer = project.timer || 0;
        const maxWorkHours = project.maxWorkHours || 0;
        const maxSeconds = maxWorkHours * 3600;

        const newProgress =
          maxSeconds > 0 ? Math.min(currentTimer / maxSeconds, 1) : 0;

        if (Math.abs(newProgress - progressRef.current) > 0.001) {
          progressRef.current = newProgress;
          setDisplayProgress(newProgress);
        }
      }, 5000); // change this to 5 seconds

      return () => clearInterval(interval);
    }, [projectId]);

    // functions to debounce the value of the ProgressCard component
    const [inputMaxWorkHours, setInputMaxWorkHours] = useState("");
    const [saving, setSaving] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // function to save the maxWorkHours in firestore
    const debouncedSave = useCallback(
      useDebounceValue(async (hours: number) => {
        if (!serviceId) return;
        const user = FIREBASE_AUTH.currentUser;
        if (!user) {
          useAlertStore
            .getState()
            .showAlert(
              t("progress.alerts.error"),
              t("progress.alerts.authenticationRequired"),
            );
          logError("ProgressCard:auth", "Missing authentication");
          return;
        }

        try {
          // check authorization
          const projectRef = doc(
            FIREBASE_FIRESTORE,
            "Users",
            user.uid,
            "Services",
            serviceId,
            "Projects",
            projectId,
          );

          const projectSnap = await getDoc(projectRef);
          if (!projectSnap.exists()) {
            useAlertStore
              .getState()
              .showAlert(
                t("progress.alerts.error"),
                t("progress.alerts.notAuthorized"),
              );

            logError("ProgressCard:updateMaxWorkHours", "Project not found");
            return;
          }

          const projectData = projectSnap.data();
          if (projectData.userId !== user.uid) {
            useAlertStore
              .getState()
              .showAlert(
                t("progress.alerts.error"),
                t("progress.alerts.notAuthorized"),
              );

            logError(
              "ProgressCard:updateMaxWorkHours",
              "Unauthorized access attempt",
            );
            return;
          }

          await updateDoc(projectRef, { maxWorkHours: hours });
          setProjectData(projectId, { maxWorkHours: hours });

          if (onSaveSuccess) onSaveSuccess();
        } catch (error) {
          logError("ProgressCard:saveMaxWorkHours", error);

          useAlertStore
            .getState()
            .showAlert(
              t("progress.alerts.error"),
              t("progress.alerts.saveFailed"),
            );
        }
      }, 500),
      [projectId, setProjectData, onSaveSuccess, serviceId],
    );

    // function to save the maxWorkHours
    const handleSave = () => {
      const user = FIREBASE_AUTH.currentUser;
      if (!user) {
        useAlertStore
          .getState()
          .showAlert(
            t("progress.alerts.error"),
            t("progress.alerts.authenticationRequired"),
          );

        logError("ProgressCard:auth", "Missing authentication");
        return;
      }

      const hours = parseFloat(inputMaxWorkHours);

      // validate input
      const validationResult = MaxWorkHoursSchema.safeParse({
        maxWorkHours: hours,
        projectId,
        userId: user.uid,
      });

      if (!validationResult.success) {
        useAlertStore
          .getState()
          .showAlert(
            t("progress.alerts.invalidInput"),
            t("progress.alerts.hoursRange"),
          );

        logError("ProgressCard:invalidInput", "Invalid input");

        return;
      }

      setSaving(true);
      debouncedSave(hours); // debounce with authorization
      setInputMaxWorkHours("");

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => setSaving(false), 500);
    };

    useEffect(() => {
      const unsubscribe = navigation.addListener("focus", () => {
        setInputMaxWorkHours("");
      });
      return unsubscribe;
    }, [navigation]);

    useEffect(() => {
      return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      };
    }, []);

    // functions to animate the progress bar
    const animatedProgress = useRef(new Animated.Value(0)).current;
    const blinkOpacity = useRef(new Animated.Value(0)).current;
    const animationRef = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
      Animated.timing(animatedProgress, {
        toValue: displayProgress,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }, [displayProgress]);

    useEffect(() => {
      const progressPercent = displayProgress * 100;

      if (progressPercent >= 100 && !hasNotifiedRef.current) {
        hasNotifiedRef.current = true;
        NotificationManager.scheduleNotification(
          t("progress.notification.targetReached"),
          t("progress.notification.targetReachedMessage"),
          { seconds: 5 },
        );
      }

      if (progressPercent < 100) {
        hasNotifiedRef.current = false;
      }

      if (progressPercent >= 100) {
        if (animationRef.current) {
          animationRef.current.stop();
          animationRef.current = null;
        }

        animationRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(blinkOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(blinkOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          //{ iterations: 10 }, // repeat the animation 10 times if it is active
        );

        animationRef.current.start();
      } else {
        blinkOpacity.setValue(0);
        if (animationRef.current) {
          animationRef.current.stop();
          animationRef.current = null;
        }
      }

      return () => {
        if (animationRef.current) {
          animationRef.current.stop();
        }
      };
    }, [displayProgress]);

    useEffect(() => {
      return () => {
        if (animationRef.current) animationRef.current.stop();
      };
    }, []);

    // functions to calculate the progress percentage
    const progressValue = Math.min(displayProgress * 100, 100);
    const displayPercentage = Math.min(displayProgress * 100, 100); // for text-indicator
    const progressValueInteger = Math.floor(displayPercentage); // for cycle-ndicator

    return (
      <View>
        {/* DetailsScreen copilot tour step 4*/}
        <CopilotStep
          name={t("progress.copilot.name")}
          order={4}
          text={t("progress.copilot.text")}
        >
          <CopilotWalkthroughView
            accessible={true}
            accessibilityLabel={
              maxWorkHours > 0 && timer > 0
                ? t("progress.progress.tracker", {
                    percent: (displayProgress * 100).toFixed(1),
                    hours: maxWorkHours,
                  })
                : t("progress.progress.noDeadline")
            }
            style={{
              alignSelf: "center",
              width: "100%",
              maxWidth: 1400,
              minWidth: 320,
              alignItems: "center",
              backgroundColor: "#191919",
              borderRadius: 10,
              padding: 20,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
              borderWidth: 1,
              borderColor: "aqua",
              marginBottom: 20,
            }}
          >
            {/* Title */}
            <Text
              accessible={false}
              accessibilityRole="header"
              style={{
                fontFamily: "MPLUSLatin_Bold",
                fontSize: accessMode ? 28 : 25,
                color: "white",
                marginBottom: 40,
                textAlign: "center",
              }}
            >
              {t("progress.title")}
            </Text>
            {/* Instructions */}
            <Text
              accessible={false}
              style={{
                fontSize: 18,
                fontFamily: accessMode
                  ? "MPLUSLatin_Bold"
                  : "MPLUSLatin_ExtraLight",
                color: "white",
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              {t("progress.instructions")}
            </Text>
            {/* Input field to enter max work hours */}
            <TextInput
              accessible={true}
              accessibilityLabel={t("progress.inputAccessibility")}
              placeholder={t("progress.inputPlaceholder")}
              placeholderTextColor={accessMode ? "white" : "grey"}
              value={inputMaxWorkHours}
              keyboardType="numeric"
              onChangeText={(text) => {
                const sanitized = sanitizeMaxWorkHours(text);
                setInputMaxWorkHours(sanitized);
              }}
              editable={!saving}
              style={{
                marginBottom: 25,
                width: screenWidth * 0.7,
                maxWidth: 400,
                borderColor: "aqua",
                borderWidth: 1.5,
                borderRadius: 12,
                paddingLeft: 15,
                paddingRight: 40,
                fontSize: 22,
                height: 50,
                color: "white",
                backgroundColor: "black",
              }}
            />
            {/* Save Button */}
            <TouchableOpacity
              accessible={true}
              accessibilityLabel={
                saving
                  ? t("progress.savingAccessibility")
                  : t("progress.saveAccessibility")
              }
              onPress={handleSave}
              disabled={saving}
              style={{
                width: screenWidth * 0.7,
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
                style={{
                  height: 45,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View
                  style={{
                    height: 50,
                    width: 200,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {saving ? (
                    // animated saving dots
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        // adjust font rendering (if a translation is too long)
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        style={{
                          marginBottom: 5,
                          fontFamily: "MPLUSLatin_Bold",
                          fontSize: 22,
                          color: "lightgray",
                          width: 120,
                          textAlign: "right",
                        }}
                      >
                        {t("progress.saving")}
                      </Text>
                      <Text
                        style={{
                          marginBottom: 5,
                          fontFamily: "MPLUSLatin_Bold",
                          fontSize: 22,
                          color: "lightgray",
                          width: 40,
                          textAlign: "left",
                        }}
                      >
                        {dots}
                      </Text>
                    </View>
                  ) : (
                    // regular save button
                    <Text
                      style={{
                        marginBottom: 5,
                        fontFamily: "MPLUSLatin_Bold",
                        fontSize: 22,
                        color: "white",
                        textAlign: "center",
                      }}
                    >
                      {t("progress.save")}
                    </Text>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* ProgressChart */}
            <View
              accessible={true}
              accessibilityLabel={
                progressValueInteger != null
                  ? t("progress.progress.label", {
                      percent: progressValueInteger,
                    })
                  : t("progress.progress.noProgress")
              }
              style={{
                position: "relative",
                width: 200,
                height: 200,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* BackgroundRing */}
              <CircularProgress
                value={100}
                radius={100}
                activeStrokeWidth={15}
                inActiveStrokeWidth={15}
                activeStrokeColor={accessMode ? "#4d4d4d" : "#242424ff"}
                inActiveStrokeColor="#1e1e1e"
                dashedStrokeConfig={{ count: 50, width: 4 }}
                progressValueColor="transparent"
                duration={0}
              />

              <View style={{ position: "absolute", top: 0, left: 0 }}>
                <CircularProgress
                  value={progressValueInteger}
                  radius={100}
                  activeStrokeWidth={15}
                  inActiveStrokeWidth={15}
                  activeStrokeColor={
                    progressValue < 100 ? "#00f7f7" : "#ff0000"
                  }
                  inActiveStrokeColor="transparent"
                  dashedStrokeConfig={{ count: 50, width: 4 }}
                  progressValueColor="#ffffff"
                  duration={1000}
                  maxValue={100}
                  valueSuffix="%"
                />
              </View>
              {/* flickering stroke animated ProgressRing */}
              {progressValue >= 100 && (
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    opacity: blinkOpacity,
                  }}
                >
                  <CircularProgress
                    value={100}
                    radius={100}
                    activeStrokeWidth={15}
                    inActiveStrokeWidth={15}
                    activeStrokeColor="#ffffff"
                    inActiveStrokeColor="transparent"
                    dashedStrokeConfig={{ count: 50, width: 4 }}
                    progressValueColor="transparent"
                    duration={0}
                  />
                </Animated.View>
              )}
            </View>

            {/* Result Text */}
            {maxWorkHours > 0 && timer > 0 && (
              <Text
                accessible={true}
                accessibilityLabel={t("progress.progress.used", {
                  percent: (displayProgress * 100).toFixed(1),
                })}
                style={{
                  color: "white",
                  fontFamily: accessMode
                    ? "MPLUSLatin_Bold"
                    : "MPLUSLatin_ExtraLight",
                  fontSize: accessMode ? 18 : 16,
                  marginTop: 20,
                }}
              >
                <Text
                  style={{
                    color: accessMode ? "#00f7f7" : "white",
                    fontSize: accessMode ? 22 : 18,
                    fontWeight: "bold",
                    fontFamily: "MPLUSLatin_Bold",
                  }}
                >
                  {(displayProgress * 100).toFixed(1)}%{" "}
                </Text>{" "}
                {t("progress.progress.usedShort")}
              </Text>
            )}
            {/* Deadline Info */}
            <View
              accessible={true}
              accessibilityLabel={t("progress.deadline.accessibility", {
                hours: maxWorkHours,
              })}
              style={{
                width: "100%",
                height: 50,
                marginTop: 20,
                top: 10,
                flexDirection: "row",
                alignItems: "center",
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
              {/* Display your current Deadline in Hours */}
              <Text
                style={{
                  color: accessMode ? "white" : "grey",
                  fontSize: 16,
                  fontFamily: "MPLUSLatin_Bold",
                  marginRight: 5,
                }}
              >
                {t("progress.deadline.label")}
              </Text>
              <Text
                style={{
                  color: "white",
                  fontSize: 30,
                  fontWeight: "bold",
                }}
              >
                {maxWorkHours.toString() || "0"}
              </Text>
            </View>

            {/* </View> */}
          </CopilotWalkthroughView>
        </CopilotStep>
      </View>
    );
  },
);

export default ProgressCard;
