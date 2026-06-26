///////////////////////////////// projectListItem.tsx //////////////////////////////

// This component is used to show a list item of a project in the HomeScreen

////////////////////////////////////////////////////////////////////////////////////

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  LayoutChangeEvent,
} from "react-native";
import * as Animatable from "react-native-animatable";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";

import { normalizeCreatedAt } from "../components/helper/normalizeCreatedAt.helper";
import { Project } from "../components/types/Project";

/////////////////////////////////////////////////////////////////////////////////////

type Props = {
  item: Project;
  index: number;

  ITEM_HEIGHT: number;
  scrollY: Animated.Value;

  accessMode: boolean;

  animationRef: (id: string, ref: any) => void;

  onPress: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAddNote: (id: string) => void;

  setLastItemHeight: (h: number) => void;
};

/////////////////////////////////////////////////////////////////////////////////////

const ProjectListItem: React.FC<Props> = ({
  item,
  index,
  ITEM_HEIGHT,
  scrollY,
  accessMode,
  animationRef,
  onPress,
  onDelete,
  onAddNote,
  setLastItemHeight,
}) => {
  // calculate animation
  const inputRange = [
    -1,
    0,
    ITEM_HEIGHT * index,
    ITEM_HEIGHT * (index + 1),
    ITEM_HEIGHT * (index + 2),
  ];

  const scale = scrollY.interpolate({
    inputRange,
    outputRange: [1, 1, 1, 0.8, 0.8],
    extrapolate: "clamp",
  });

  const opacity = scrollY.interpolate({
    inputRange,
    outputRange: [1, 1, 1, 0.5, 0],
    extrapolate: "clamp",
  });

  // set the date in the right format
  const dateObj = normalizeCreatedAt(item.createdAt);

  // calculate the last item height to handle functionality of the scroll animation
  const measureItemHeight = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setLastItemHeight(height);
  };

  return (
    // add and delete  project card animation
    <Animatable.View
      animation="zoomInUp"
      duration={1500}
      delay={index * 100}
      useNativeDriver
      // ref to animate the project deleting
      ref={(ref) => {
        if (ref && item.id) {
          animationRef(item.id, ref);
        }
      }}
    >
      {/* Animation View parameters */}
      <Animated.View
        style={{
          height: ITEM_HEIGHT,
          transform: [{ scale }],
          opacity,
          margin: 5,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          borderWidth: 1,
          borderColor: "aqua",
          minWidth: "98%",
          backgroundColor: "#191919",
          borderRadius: 8,
        }}
        onLayout={measureItemHeight}
      >
        {/* LEFT SIDE */}
        {/* Button to navigate to the details screen */}
        <TouchableOpacity
          onPress={() => onPress(item.id, item.name)}
          accessibilityRole="button"
          accessibilityLabel={`Project ${item.name}, created on ${
            dateObj ? dayjs(dateObj).format("DD MMMM YYYY") : "unknown date"
          }`}
          accessibilityHint="Tap to view project details"
          style={{ flex: 1 }}
        >
          <View style={{ height: "100%", width: "100%" }}>
            {/* Section with date in the project container */}
            {dateObj ? (
              <Text
                style={{
                  color: accessMode ? "white" : "grey",
                  fontSize: 14,
                }}
              >
                {dayjs(dateObj).format("DD.MM.YYYY")}
              </Text>
            ) : (
              <Text style={{ color: "gray", fontSize: 13 }}>
                No date available
              </Text>
            )}
            {/* Project name in the project container */}
            <Text
              style={{
                marginTop: 5,
                marginLeft: 30,
                fontSize: accessMode ? 28 : 24,
                fontFamily: "MPLUSLatin_Bold",
                color: "white",
              }}
            >
              {item.name}
            </Text>
          </View>
        </TouchableOpacity>

        {/* RIGHT SIDE */}
        <View
          style={{
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-evenly",
            marginRight: 10,
            height: "100%",
          }}
        >
          {/* Button to delete a project */}
          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            accessibilityRole="button"
            accessibilityLabel="Delete the project"
            accessibilityHint="Delete the project"
          >
            <AntDesign
              name="delete"
              size={30}
              color={accessMode ? "white" : "darkgrey"}
            />
          </TouchableOpacity>
          {/* Button to add a note to a project */}
          <TouchableOpacity
            onPress={() => onAddNote(item.id)}
            accessibilityRole="button"
            accessibilityLabel="Add a note"
            accessibilityHint="Add a note. You can watch it in the details screen"
          >
            <MaterialIcons
              name="edit-note"
              size={30}
              color={accessMode ? "white" : "darkgrey"}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animatable.View>
  );
};

export default ProjectListItem;
