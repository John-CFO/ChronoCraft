///////////////////////////////////// HomeSceen Component////////////////////////////////////////////

// This component shows a list of projects and enabled the user to add and delete his projects.
// The user can also write notes to every project in the list wich is also visible in the DetailsScreen.

// This component used Firebase Firestore for the datapersistence and and react-native-modal for the notemodal

// note: item.id is the local ID of the project. The project.id is the remote ID from firebase to itentify a project.

//////////////////////////////////////////////////////////////////////////////////////////////////////

import {
  View,
  Text,
  Keyboard,
  TextInput,
  TouchableOpacity,
  Animated,
  LayoutChangeEvent,
  Dimensions,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Modal from "react-native-modal";
import { Alert } from "react-native";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { LinearGradient } from "expo-linear-gradient";
import { AntDesign } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { CopilotStep, walkthroughable } from "react-native-copilot";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  FIREBASE_FIRESTORE,
  FIREBASE_AUTH,
  FIREBASE_APP,
} from "../firebaseConfig";
import { useStore } from "../components/TimeTrackingState";
import NoteModal from "../components/NoteModal";
import RoutingLoader from "../components/RoutingLoader";
import TourButton from "../components/TourButton";

//////////////////////////////////////////////////////////////////////////////////////////////////

type RootStackParamList = {
  Home: undefined;
  Details: { projectId: string; projectName: string };
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

//////////////////////////////////////////////////////////////////////////////////////////////////

const HomeScreen: React.FC = () => {
  // navigation declaration to navigate from any project to DetailsScreen
  const navigation = useNavigation<HomeScreenNavigationProp>();
  // state to handle the loading animation
  const [isLoading, setIsLoading] = useState(true);

  // definition of the walkthroughable component to handle the copilot with (TouchableOpacity)
  const WalkthroughTouchableOpacity = walkthroughable(TouchableOpacity);

  // definition of the walkthroughable component to handle the copilot with (View)
  const CopilotView = walkthroughable(View);

  // declaire the firebase authentication
  const auth: Auth = getAuth(FIREBASE_APP);
  // initialize the project id globally to reset all components in the details screen
  const { setProjectId } = useStore();

  // handle project state with props title, id and name
  const [projects, setProjects] = useState<
    {
      createdAt: any;
      id: string;
      name: any;
      notes: {
        content: string;
        timestamp: any;
      }[];
    }[]
  >([]);

  // new project name state
  const [newProjectName, setNewProjectName] = useState("");
  // handle note modal state
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  // Note ID state
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  // handle refresh state to update the date
  const [refresh, setRefresh] = useState(false);

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // scroll animation declaration
  const ITEM_HEIGHT: number = 100;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [averageItemHeight, setAverageItemHeight] = useState(ITEM_HEIGHT);

  // function to load data from firestore
  useEffect(() => {
    // constant to handle the loading animation
    const timer = setTimeout(() => {
      // fetch the data from firestore with snapshots
      const fetchData = async ({ user }: { user: any }) => {
        try {
          const db = FIREBASE_FIRESTORE;
          const projectsCollection = collection(
            db,
            "Users",
            user.uid,
            "Services",
            "AczkjyWoOxdPAIRVxjy3",
            "Projects"
          );

          const projectsSnapshot = await getDocs(projectsCollection);
          const projectsData = projectsSnapshot.docs
            .filter((doc) => doc.exists())
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
          setProjects(
            projectsData as {
              createdAt: any;
              id: string;
              name: string;
              notes: { content: string; timestamp: any }[];
            }[]
          );
          setIsLoading(false);
        } catch (error) {
          console.error("Error fetching projects", error);
          setIsLoading(false);
        }
      };
      fetchData({ user: FIREBASE_AUTH.currentUser });
    }, 3000);

    return () => clearTimeout(timer);
  }, [refresh]);

  // function to add projects
  const handleAddProject = async () => {
    // check if project name is empty
    if (!newProjectName.trim()) {
      Alert.alert("Sorry", "Add a project title first to continue.");
      return;
    }
    try {
      const user = FIREBASE_AUTH.currentUser;
      if (user) {
        const db = FIREBASE_FIRESTORE;
        const projectsCollection = collection(
          db,
          "Users",
          user.uid,
          "Services",
          "AczkjyWoOxdPAIRVxjy3",
          "Projects"
        );
        const newProjectRef = await addDoc(projectsCollection, {
          uid: user.uid,
          name: newProjectName,
          createdAt: serverTimestamp(),
          startTime: null,
          endTime: null,
          pauseTime: null,
          elapsedTime: 0,
          hourlyRate: 0.0,
          totalEarnings: 0,
          originalStartTime: null,
          lastStartTime: null,
          timer: 0,
        });
        const newProject = {
          id: newProjectRef.id,
          name: newProjectName,
          createdAt: new Date(), // or dayjs().format('YYYY-MM-DD HH:mm:ss')
          notes: [], // create a empty array for notes
        };
        setProjects((prevProjects) => [...prevProjects, newProject]);
        setNewProjectName("");
        setRefresh(!refresh);
        Keyboard.dismiss();
      }
    } catch (error) {
      console.error("Error adding project", error);
    }
  };

  // function to delete projects
  const handleDeleteProject = async (projectId: string) => {
    // alert to inform user what he has to do first before pressing the delete button
    Alert.alert(
      "Attention!",
      "Do you really want to delete the project? If you delete the project, all notes will be deleted as well.",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Project deletion canceled"),
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const user = FIREBASE_AUTH.currentUser;
              if (!user) {
                Alert.alert("Error", "User not authenticated.");
                return;
              }

              const db = FIREBASE_FIRESTORE;
              const noteCollection = collection(
                db,
                "Users",
                user.uid,
                "Services",
                "AczkjyWoOxdPAIRVxjy3",
                "Projects",
                projectId,
                "Notes"
              );

              // snapshot to delete notes
              const notesSnapshot = await getDocs(noteCollection);

              // delete each note
              const deleteNotesPromises = notesSnapshot.docs.map(
                async (doc) => {
                  await deleteDoc(doc.ref);
                }
              );

              // wait for all note deletions to finish before deleting the project
              await Promise.all(deleteNotesPromises);

              // now delete the project
              const projectDocRef = doc(
                db,
                "Users",
                user.uid,
                "Services",
                "AczkjyWoOxdPAIRVxjy3",
                "Projects",
                projectId
              );
              await deleteDoc(projectDocRef);

              // remove project from state
              setProjects((prevProjects) =>
                prevProjects.filter((project) => project.id !== projectId)
              );

              // optional: refresh the list
              setRefresh(!refresh);
              // console.log("Project and related notes deleted successfully.");
            } catch (error) {
              console.error("Delete project or notes failed", error);
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  // function to navigate to the details screen if user pressed an a listed project
  const handleProjectPress = (projectId: string, projectName: string) => {
    // console.log("navigate to details screen", projectId);
    setProjectId(projectId); // to send it global to the details screen to reset all components in the details screen
    navigation.navigate("Details", { projectId, projectName });
  };

  // function to show the note-modal
  const openNoteModal = (projectId: string) => {
    // console.log("Note modal opened with ID:", projectId);
    setSelectedProjectId(projectId);
    setNoteModalVisible(true);
  };

  // function to close the note-modal
  const closeNoteModal = () => {
    // console.log("Note modal closed");
    setNoteModalVisible(false);
  };

  // dot animation for TextInput
  const [dots, setDots] = useState(".");

  useEffect(() => {
    // initial count
    let count = 0;

    // setInterval condition
    const interval = setInterval(() => {
      if (count === 0) {
        setDots(".");
      } else if (count === 1) {
        setDots("..");
      } else if (count === 2) {
        setDots("...");
      } else {
        setDots("");
        count = -1; // restart the animation
      }

      count += 1;
    }, 700); // handle animation time

    // clear the interval
    return () => clearInterval(interval);
  }, []);

  // scroll animation with parameters to handle the scroll animation
  const renderItem = ({ item }: { item: any }) => {
    const index = projects.indexOf(item);
    const inputRange = [
      -1,
      0,
      ITEM_HEIGHT * index,
      ITEM_HEIGHT * (index + 1),
      ITEM_HEIGHT * (index + 2),
    ];

    // scale parameters
    const scale = scrollY.interpolate({
      inputRange,
      outputRange: [1, 1, 1, 0.8, 0.8],
      extrapolate: "clamp", // ensures that container items remain in the container when it scaling
    });

    // opacity parameters
    const opacity = scrollY.interpolate({
      inputRange,
      outputRange: [1, 1, 1, 0.5, 0],
      extrapolate: "clamp",
    });

    // calculate the average item height to handle functionality of the scroll animation
    const mesureItemHeight = (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      setAverageItemHeight(height);
    };

    return (
      // Animation View parameters
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
        onLayout={mesureItemHeight}
      >
        {/* Button to navigate to the details screen */}
        <TouchableOpacity
          onPress={() => handleProjectPress(item.id as string, item.name)}
          style={{ alignItems: "center", justifyContent: "center", flex: 1 }}
        >
          <View
            style={{
              height: "100%",
              width: "100%",
            }}
          >
            {/* Section with date in the project container */}
            {item.createdAt && typeof item.createdAt.toDate === "function" && (
              <Text
                style={{
                  color: "grey",
                  paddingLeft: 10,
                  marginTop: 5,
                }}
              >
                {dayjs(item.createdAt.toDate()).format("DD.MM.YYYY")}
              </Text>
            )}
            {/* Project name in the project container */}
            <Text
              style={{
                marginTop: 5,
                marginLeft: 30,
                fontSize: 24,
                fontFamily: "MPLUSLatin_Bold",
                color: "white",
              }}
            >
              {item.name}
            </Text>
          </View>
        </TouchableOpacity>
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
          <TouchableOpacity onPress={() => handleDeleteProject(item.id)}>
            <AntDesign name="delete" size={30} color="darkgrey" />
          </TouchableOpacity>
          {/* Button to add a note to a project */}
          <TouchableOpacity onPress={() => openNoteModal(item.id)}>
            <MaterialIcons name="edit-note" size={30} color="darkgrey" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  useEffect(() => {
    const checkStorage = async () => {
      const value = await AsyncStorage.getItem("hasSeenHomeTour");
      console.log("Storage-Wert:", value);
    };

    checkStorage();
  }, []);

  return (
    <View style={{ flex: 1, width: "100%", backgroundColor: "black" }}>
      {/* RoutingLoader section */}
      {isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <RoutingLoader />
        </View>
      ) : (
        <>
          {/* Header section */}
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
              - Your Projects -
            </Text>
          </View>
          {/* Copilot tour button */}
          <TourButton
            storageKey="hasSeenHomeTour"
            userId={auth.currentUser?.uid ?? ""}
            needsRefCheck={false}
          />
          {/* Section to scroll the projects list with the scroll animation */}
          {projects.length > 0 ? (
            <Animated.FlatList
              style={{
                flex: 1,
                marginHorizontal: "3%",
                marginBottom: "20%",
                height: "50%",
                borderRadius: 12,
                borderWidth: 0.5,
              }}
              contentContainerStyle={{
                width: "100%",
                alignItems: "center",
              }}
              scrollEnabled={true}
              data={projects}
              keyExtractor={(item) => item.id}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
              renderItem={renderItem}
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: "80%",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "transparent",
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
                You haven't any projects yet.
              </Text>
            </View>
          )}
          {/* Project input */}

          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              width: "100%",
              height: 80,
              backgroundColor: "transparent",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 20,
            }}
          >
            {/* CopilotStep wrapped around the TextInput */}
            <View
              style={{
                position: "relative",
                width: screenWidth * 0.9,
                maxWidth: 320,
              }}
            >
              <TextInput
                style={{
                  width: "100%",
                  borderColor: "aqua",
                  borderWidth: 1.5,
                  borderRadius: 12,
                  paddingLeft: 15,
                  paddingRight: 40,
                  paddingBottom: 5,
                  fontSize: 22,
                  height: 50,
                  color: "white",
                  fontWeight: "bold",
                  backgroundColor: "#191919",
                }}
                placeholder={`Add new Project${dots}`}
                placeholderTextColor="grey"
                editable={true}
                onChangeText={setNewProjectName}
                maxLength={48}
                value={newProjectName}
              />

              {/* Copilot tour for the HomeScreen step 1 */}
              <CopilotStep
                text="Enter the name of your project here."
                order={1}
                name="Add Name"
              >
                {/* CopilotView settled over the Text Input */}
                <CopilotView
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "transparent",
                    pointerEvents: "none",
                  }}
                />
              </CopilotStep>
            </View>

            {/* Copilot tour for the HomeScreen step 2 */}
            <CopilotStep text="Add the project." order={2} name="Add Project">
              {/* + Button to add a new project */}
              <WalkthroughTouchableOpacity onPress={handleAddProject}>
                <LinearGradient
                  colors={["#00FFFF", "#FFFFFF"]}
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 25,
                    height: 50,
                    width: 50,
                  }}
                >
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: "transparent",
                      borderWidth: 3,
                      borderColor: "white",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 60,
                        fontWeight: "bold",
                        lineHeight: 57,
                        color: "grey",
                      }}
                    >
                      +
                    </Text>
                  </View>
                </LinearGradient>
              </WalkthroughTouchableOpacity>
            </CopilotStep>
          </View>
          {/* Note Modal */}
          <Modal
            isVisible={noteModalVisible}
            backdropColor="black"
            onBackdropPress={closeNoteModal}
            swipeDirection={["up", "down"]}
            onSwipeComplete={closeNoteModal}
            style={{ justifyContent: "center", alignItems: "center" }}
          >
            <NoteModal
              projectId={selectedProjectId}
              onClose={() => {
                setNoteModalVisible(false);
              }}
            />
          </Modal>
        </>
      )}
    </View>
  );
};

export default HomeScreen;
