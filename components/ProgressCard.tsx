///////////////////////////ProgressCard Component/////////////////////////////////////

// This component is used to display the progress of a project and to save the progress to the database
// The userr can also change the maxWorkHours and save them to the database

//////////////////////////////////////////////////////////////////////////////////////

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
  Animated,
  Easing,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import CircularProgress from "react-native-circular-progress-indicator";
import { doc, updateDoc } from "firebase/firestore";

import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useStore } from "./TimeTrackingState";
import { sanitizeMaxWorkHours } from "./InputSanitizers";
import useDebounceValue from "../hooks/useDebounceValue";

///////////////////////////////////////////////////////////////////////////////////////

interface ProgressCardProps {
  projectId: string;
  serviceId: string;
  maxHoursFromDB: number | null;
  onSaveSuccess?: () => void;
}

///////////////////////////////////////////////////////////////////////////////////////

const ProgressCard: React.FC<ProgressCardProps> = React.memo(
  ({ projectId, onSaveSuccess }) => {
    // decare the useNavigation hook
    const navigation = useNavigation();
    // decare the useStore hook
    const { setProjectData } = useStore();
    // decare the useWindowDimensions hook
    const { width: screenWidth } = useWindowDimensions();

    // global state with memoization
    const { projectState } = useStore((state) => ({
      projectState: state.projects[projectId],
    }));

    // memoized derived values
    const maxWorkHours = projectState?.maxWorkHours || 0;
    const maxSeconds = useMemo(() => maxWorkHours * 3600, [maxWorkHours]);
    const timer = projectState?.timer || 0;

    // debounced save function
    const debouncedSave = useRef(
      useDebounceValue(async (hours: number) => {
        const user = FIREBASE_AUTH.currentUser;
        if (!user) return;

        try {
          const docRef = doc(
            FIREBASE_FIRESTORE,
            "Users",
            user.uid,
            "Services",
            "AczkjyWoOxdPAIRVxjy3",
            "Projects",
            projectId
          );

          await updateDoc(docRef, { maxWorkHours: hours });

          setProjectData(projectId, { maxWorkHours: hours });

          if (onSaveSuccess) onSaveSuccess();
        } catch (error) {
          console.error("Error saving max work hours:", error);
          Alert.alert("Failed to save. Try again.");
        }
      }, 500)
    ).current;

    // calculate progress with memoization
    const progressRaw = useMemo(() => {
      return maxSeconds > 0 ? timer / maxSeconds : 0;
    }, [timer, maxSeconds]);
    const progress = Math.min(progressRaw, 1); // 0 bis 1 → für Animated
    const progressValue = Math.min(progressRaw * 100, 100); // 0 bis 100 → für CircularProgress

    // input state
    const [inputMaxWorkHours, setInputMaxWorkHours] = useState("");
    const [hasUserEditedInput, setHasUserEditedInput] = useState(false);
    const [saving, setSaving] = useState(false);

    // reset input on screen focus
    useEffect(() => {
      const unsubscribe = navigation.addListener("focus", () => {
        setInputMaxWorkHours("");
      });
      return unsubscribe;
    }, [navigation]);

    // ref for save timeout
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // hook to clean up the timeout
    useEffect(() => {
      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }, []);

    // save handler with debouncing
    const handleSave = () => {
      const hours = parseFloat(inputMaxWorkHours);
      if (isNaN(hours) || hours <= 0) {
        Alert.alert("Please enter a valid number of hours > 0");
        return;
      }

      setSaving(true);
      debouncedSave(hours);

      // optimistic UI update
      setInputMaxWorkHours("");

      // safe timeout-ref and clear previous if active
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => setSaving(false), 500);
    };

    // native-driven animation for progress
    const animatedProgress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(animatedProgress, {
        toValue: progress,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }, [progress]);

    // deathline arrived animation
    const blinkOpacity = useRef(new Animated.Value(0)).current;
    // hook to animate the progress indicator on deathline with flickering
    useEffect(() => {
      if (progressValue >= 100) {
        Animated.loop(
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
          ])
        ).start();
      } else {
        blinkOpacity.stopAnimation();
        blinkOpacity.setValue(0);
      }
    }, [progressValue]);

    return (
      <View
        style={{
          width: screenWidth * 0.9,
          maxWidth: 600,
          alignItems: "center",
          backgroundColor: "#191919",
          borderRadius: 12,
          padding: 20,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
          borderWidth: 1,
          borderColor: "aqua",
          marginVertical: 30,
        }}
      >
        {/* Title */}
        <Text
          style={{
            fontFamily: "MPLUSLatin_Bold",
            fontSize: 25,
            color: "white",
            marginBottom: 40,
            textAlign: "center",
          }}
        >
          Deadline-Tracker
        </Text>
        {/* Instructions */}
        <Text
          style={{
            fontSize: 18,
            fontFamily: "MPLUSLatin_ExtraLight",
            color: "white",
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          "Set your maximum allowed work time"
        </Text>
        {/* Input field to enter max work hours */}
        <TextInput
          placeholder="(e.g. 5)"
          placeholderTextColor="grey"
          value={inputMaxWorkHours}
          keyboardType="numeric"
          onChangeText={(text) => {
            const sanitized = sanitizeMaxWorkHours(text);
            setInputMaxWorkHours(sanitized); // use sanitized value
            if (!hasUserEditedInput) setHasUserEditedInput(true);
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
              paddingVertical: 6,
              justifyContent: "center",
              alignItems: "center",
            }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text
              style={{
                fontFamily: "MPLUSLatin_Bold",
                fontSize: 22,
                color: saving ? "lightgray" : "white",
                marginBottom: 5,
                paddingRight: 10,
              }}
            >
              {saving ? "Saving..." : "Save"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ProgressChart */}
        <View
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
            activeStrokeColor="#1e1e1e"
            inActiveStrokeColor="#1e1e1e"
            dashedStrokeConfig={{ count: 50, width: 4 }}
            progressValueColor="transparent"
            duration={0}
          />
          {/* ProgressRing */}
          <View style={{ position: "absolute", top: 0, left: 0 }}>
            <CircularProgress
              value={progressValue}
              radius={100}
              activeStrokeWidth={15}
              inActiveStrokeWidth={15}
              // if progress arrives at 100%, change color
              activeStrokeColor={progressValue < 100 ? "#00f7f7" : "#ff0000"}
              dashedStrokeConfig={{ count: 50, width: 4 }}
              inActiveStrokeColor="transparent"
              progressValueColor="#ffffff"
              duration={1000}
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
                value={progressValue}
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
        {maxSeconds > 0 && timer > 0 && (
          <Text
            style={{
              color: "white",
              fontFamily: "MPLUSLatin_ExtraLight",
              fontSize: 16,
              marginTop: 20,
            }}
          >
            {progress.toFixed(1)}% of your max work time used
          </Text>
        )}
        <View
          style={{
            width: "100%",
            height: 50,
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
            marginTop: 20,
          }}
        >
          {/* Display your current Deadline in Hours */}
          <Text
            style={{
              color: "grey",
              fontSize: 16,
              fontFamily: "MPLUSLatin_Bold",
              marginRight: 5,
            }}
          >
            Your Deadline:
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
      </View>
    );
  }
);

export default ProgressCard;
