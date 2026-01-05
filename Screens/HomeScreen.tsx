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
  FlatList,
} from "react-native";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Modal from "react-native-modal";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { LinearGradient } from "expo-linear-gradient";
import { AntDesign } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import {
  CopilotProvider,
  CopilotStep,
  walkthroughable,
} from "react-native-copilot";
import * as Animatable from "react-native-animatable";

import {
  FIREBASE_FIRESTORE,
  FIREBASE_AUTH,
  FIREBASE_APP,
} from "../firebaseConfig";
import { RootStackParamList } from "../navigation/RootStackParams";
import { useStore } from "../components/TimeTrackingState";
import NoteModal from "../components/NoteModal";
import RoutingLoader from "../components/RoutingLoader";
import { useService } from "../components/contexts/ServiceContext";
import TourCard from "../components/services/copilotTour/TourCard";
import DismissKeyboard from "../components/DismissKeyboard";
import { useCopilotOffset } from "../components/services/copilotTour/CopilotOffset";
import CustomTooltip from "../components/services/copilotTour/CustomToolTip";
import { useAlertStore } from "../components/services/customAlert/alertStore";
import { useDotAnimation } from "../components/DotAnimation";
import { sanitizeTitle } from "../components/InputSanitizers";
import SortModal from "../components/SortModal";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { getValidatedDocs } from "../validation/getDocsWrapper.sec";
import {
  FirestoreProjectSchema,
  FirestoreUserSchema,
  FirestoreProject,
} from "../validation/firestoreSchemas.sec";

//////////////////////////////////////////////////////////////////////////////////////////////////
type HomeScreenRouteProp = RouteProp<
  { Home: { fromRegister?: boolean; triggerReload?: any } },
  "Home"
>;

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

//////////////////////////////////////////////////////////////////////////////////////////////////

// definition of the walkthroughable component to handle the copilot with (TouchableOpacity)
const WalkthroughTouchableOpacity = walkthroughable(TouchableOpacity);

// definition of the walkthroughable component to handle the copilot with (View)
const CopilotView = walkthroughable(View);

const HomeScreen: React.FC = () => {
  // initialize the copilot offset
  const offset = useCopilotOffset();

  // initialize routing
  const route = useRoute<HomeScreenRouteProp>();

  // navigation declaration to navigate from any project to DetailsScreen
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // state to handle the loading animation
  const [isLoading, setIsLoading] = useState(true);

  // state to handle if the user can read the projects
  const [canReadProjects, setCanReadProjects] = useState(false);

  // states to control the loading screen
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [loading, setLoading] = useState(true);

  // state to control the copilot tour
  const [showTour, setShowTour] = useState(false);

  // state to handle if the copilot card is visible
  const [showTourCard, setShowTourCard] = useState<null | boolean>(null);

  // declaire the firebase authentication
  const auth: Auth = getAuth(FIREBASE_APP);

  // declare the service id
  const { serviceId } = useService();

  // initialize the project id globally to reset all components in the details screen
  const { setProjectId } = useStore();

  // handle project state with props title, id and name
  const [projects, setProjects] = useState<FirestoreProject[]>([]);

  // new project name state
  const [newProjectName, setNewProjectName] = useState("");

  // state to handel sort modal
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const openSortModal = () => {
    setSortModalVisible(true);
  };

  const closeSortModal = () => {
    setSortModalVisible(false);
  };

  // sort order state
  const [sortOrder, setSortOrder] = useState("DATE_DESC");

  // function to sort the projects
  const sortedProjects = React.useMemo(() => {
    return [...projects].sort((a, b) => {
      switch (sortOrder) {
        case "DATE_DESC":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "DATE_ASC":
          return a.createdAt.getTime() - b.createdAt.getTime();
        case "NAME_ASC":
          return a.name.localeCompare(b.name);
        case "NAME_DESC":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
  }, [projects, sortOrder]);

  // ref to handle the flatlist scroll animation and refresh the projects list
  const flatListRef = React.useRef<FlatList>(null);

  React.useEffect(() => {
    // if sortOrder or projects change, scroll back to the top
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [sortOrder, projects]);

  // handle note modal state
  const [noteModalVisible, setNoteModalVisible] = useState(false);

  // Note ID state
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // handle refresh state to update the date
  const [refresh, setRefresh] = useState(false);

  // ref to handle the delete aniamtion
  const animationRefs = useRef<{ [key: string]: any }>({});

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // scroll animation declaration
  const ITEM_HEIGHT: number = 100;
  const scrollY = useRef(new Animated.Value(0)).current;

  const [averageItemHeight, setAverageItemHeight] = useState(ITEM_HEIGHT);

  // Gatecheck to check if the user can read the projects
  useEffect(() => {
    if (!serviceId) return;
    const checkCanReadProjects = async () => {
      const user = FIREBASE_AUTH.currentUser;
      if (!user) {
        setCanReadProjects(false);
        setIsLoading(false);
        return;
      }
      try {
        const serviceRef = doc(
          FIREBASE_FIRESTORE,
          "Users",
          user.uid,
          "Services",
          serviceId
        );

        const serviceSnap = await getDoc(serviceRef);
        if (!serviceSnap.exists()) {
          setCanReadProjects(true);
        } else {
          setCanReadProjects(true);
        }
      } catch {
        // expected on first entry
        setCanReadProjects(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkCanReadProjects();
  }, [serviceId]);

  // function to load data from firestore
  useEffect(() => {
    if (!canReadProjects || !serviceId) return;

    let cancelled = false;
    setIsLoading(true);

    const fetchProjects = async () => {
      const user = FIREBASE_AUTH.currentUser;
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if the service exists
        const serviceRef = doc(
          FIREBASE_FIRESTORE,
          "Users",
          user.uid,
          "Services",
          serviceId
        );
        const serviceSnap = await getDoc(serviceRef);
        if (!serviceSnap.exists()) {
          setProjects([]);
          setIsLoading(false);
          return;
        }

        const projectsCollection = collection(
          FIREBASE_FIRESTORE,
          "Users",
          user.uid,
          "Services",
          serviceId,
          "Projects"
        );

        // validated projects from Firestore
        const validatedProjects = await getValidatedDocs(
          projectsCollection,
          FirestoreProjectSchema
        );

        if (cancelled) return;
        // ensure createdAt is always set
        const projectsWithFallback = validatedProjects.map(
          (p: FirestoreProject) => ({
            ...p,
            createdAt: p.createdAt ?? new Date(),
          })
        );

        setProjects(projectsWithFallback);
      } catch (error) {
        console.error("Error fetching projects", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchProjects();

    return () => {
      cancelled = true;
    };
  }, [canReadProjects, refresh, serviceId]);

  // function to add projects
  const handleAddProject = async () => {
    if (!serviceId) return;
    // check if project name is empty
    if (!newProjectName.trim()) {
      useAlertStore
        .getState()
        .showAlert("Sorry", "Add a project title first to continue.");
      return;
    }

    // input validation
    if (newProjectName.length > 100) {
      useAlertStore.getState().showAlert("Error", "Project name too long");
      return;
    }

    try {
      const user = FIREBASE_AUTH.currentUser;
      if (!user) return;

      const db = FIREBASE_FIRESTORE;
      const projectsCollection = collection(
        db,
        "Users",
        user.uid,
        "Services",
        serviceId,
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

      // add project with fallback
      const projectWithFallback = {
        id: newProjectRef.id,
        name: newProjectName,
        createdAt: new Date(),
      };

      // validate project with zod schema
      const validatedProject =
        FirestoreProjectSchema.parse(projectWithFallback);

      // state update with guaranteed values
      setProjects((prev) => [
        ...prev,
        {
          ...validatedProject,
          createdAt: validatedProject.createdAt ?? new Date(),
        },
      ]);

      setNewProjectName("");
      setRefresh((r) => !r);
      Keyboard.dismiss();
    } catch (error) {
      console.error("Error adding project", error);
    }
  };

  // function to delete projects
  const handleDeleteProject = async (projectId: string) => {
    // alert to inform user what he has to do first before pressing the delete button
    useAlertStore
      .getState()

      .showAlert(
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
            style: "destructive",
            onPress: async () => {
              try {
                // use ref to animate deleting
                const ref = animationRefs.current[projectId];
                if (ref) {
                  await ref.zoomOut(300);
                }

                // check if user is authenticated
                const user = FIREBASE_AUTH.currentUser;
                if (!user) {
                  useAlertStore
                    .getState()
                    .showAlert("Error", "User not authenticated.");
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

                // wait for all note deletions to finish before deleting the project
                await Promise.all(
                  notesSnapshot.docs.map((doc) => deleteDoc(doc.ref))
                );
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
                setProjects((prev) => prev.filter((p) => p.id !== projectId));
                // optional: refresh the list
                setRefresh((prev) => !prev);
              } catch (err) {
                console.error("Delete project or notes failed", err);
              }
            },
          },
        ]
      );
  };

  // function to navigate to the details screen if user pressed an a listed project
  const handleProjectPress = (projectId: string, projectName: string) => {
    // console.log("navigate to details screen", projectId);
    setProjectId(projectId); // to send it global to the details screen to reset all components in the details screen
    navigation.navigate("Details", { projectId, projectName });
  };

  // function to handle sorting
  const handleSortChange = (newSort: string) => {
    // console.log("Sort order changed to:", newSort);
    setSortOrder(newSort);
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

  // define the dot animation with a delay
  const dots = useDotAnimation(loading, 700);

  // scroll animation with parameters to handle the scroll animation
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    // Animation-Berechnungen
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

    // converte date to enable both unix timestamps and firebase timestamps
    let dateObj: Date | null = null;
    if (item.createdAt) {
      if (item.createdAt instanceof Date) {
        dateObj = item.createdAt;
      } else if (
        item.createdAt.toDate &&
        typeof item.createdAt.toDate === "function"
      ) {
        dateObj = item.createdAt.toDate();
      } else if (typeof item.createdAt === "number") {
        // Fallback for Unix-Timestamps
        dateObj = new Date(item.createdAt);
      }
    }

    // calculate the average item height to handle functionality of the scroll animation
    const mesureItemHeight = (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      setAverageItemHeight(height);
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
            animationRefs.current[item.id] = ref;
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
          onLayout={mesureItemHeight}
        >
          {/* Button to navigate to the details screen */}
          <TouchableOpacity
            onPress={() => handleProjectPress(item.id as string, item.name)}
            accessibilityRole="button"
            accessibilityLabel={`Project ${item.name}, created on ${
              dateObj ? dayjs(dateObj).format("DD MMMM YYYY") : "unknown date"
            }`}
            accessibilityHint="Tap to view project details"
            style={{ alignItems: "center", justifyContent: "center", flex: 1 }}
          >
            <View
              style={{
                height: "100%",
                width: "100%",
              }}
            >
              {/* Section with date in the project container */}
              {dateObj ? (
                <Text
                  style={{
                    color: accessMode ? "white" : "grey",
                    fontSize: accessMode ? 16 : 13,
                    paddingLeft: 10,
                    marginTop: 5,
                  }}
                >
                  {dayjs(dateObj).format("DD.MM.YYYY")}
                </Text>
              ) : (
                <Text
                  style={{
                    color: "gray",
                    fontSize: 13,
                    paddingLeft: 10,
                    marginTop: 5,
                    fontStyle: "italic",
                  }}
                >
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
              onPress={() => handleDeleteProject(item.id)}
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
              onPress={() => openNoteModal(item.id)}
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

  // hook to check Firestore if the user has seen the Copilot home tour
  const fetchTourStatus = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const docRef = doc(FIREBASE_FIRESTORE, "Users", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const raw = docSnap.data();
      const parsed = FirestoreUserSchema.safeParse(raw);
      if (!parsed.success) {
        console.error("Invalid user data in fetchTourStatus:", parsed.error);
        setShowTourCard(false);
        return;
      }
      setShowTourCard(parsed.data.hasSeenHomeTour === false);
    } else {
      setShowTourCard(false);
    }
  };

  // hooks to update the screen state for the Copilot homeTour after registaration and after restarting the tour
  // if it´s the first mount after registration
  useEffect(() => {
    if (route.params?.fromRegister || route.params?.triggerReload) {
      fetchTourStatus();
    }
  }, [route.params?.fromRegister, route.params?.triggerReload]);

  // hook for restarting the tour after restarting the tour
  useFocusEffect(
    useCallback(() => {
      fetchTourStatus();
    }, [])
  );

  // delay the setting of showTourCard
  useEffect(() => {
    if (!loading && minTimePassed && showTour) {
      const timer = setTimeout(() => {
        setShowTourCard(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, minTimePassed, showTour]);

  // function to disable the copilot order and step number
  const EmptyStepNumber = () => {
    return null;
  };

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );
  // console.log("accessMode in LoginScreen:", accessMode);

  return (
    <DismissKeyboard>
      <SafeAreaView style={{ flex: 1 }}>
        <CopilotProvider
          overlay="svg"
          verticalOffset={offset}
          tooltipComponent={CustomTooltip}
          stepNumberComponent={EmptyStepNumber}
          backdropColor="rgba(0,0,0,0.6)"
          arrowColor="aqua"
          tooltipStyle={{
            backgroundColor: "#191919",
            borderRadius: 12,
            padding: 16,
            borderWidth: 2,
            borderColor: "aqua",
          }}
        >
          <View
            style={{
              flex: 1,
              width: "100%",
              backgroundColor: "black",
              position: "relative",
              zIndex: 0,
            }}
          >
            {/* Copilot Card with dark overlay */}
            {showTourCard && (
              <View
                style={{
                  position: "absolute",
                  width: "100%",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                  zIndex: 10,
                }}
              >
                <TourCard
                  storageKey="hasSeenHomeTour"
                  userId={auth.currentUser?.uid ?? ""}
                  needsRefCheck={false}
                  setShowTourCard={setShowTourCard}
                  showTourCard={showTourCard}
                />
              </View>
            )}

            {/* RoutingLoader section */}
            {isLoading ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <RoutingLoader />
              </View>
            ) : (
              <>
                {/* Header section */}
                <View
                  accessible
                  accessibilityRole="header"
                  accessibilityLabel="Your Projects"
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

                {/* CopilotStep wrapped around the SortModal button - Step 1 */}
                <CopilotStep
                  text="Here you can sort your projects by priority"
                  name="sort"
                  order={1}
                >
                  {/* open SortModal button */}
                  <WalkthroughTouchableOpacity
                    style={{
                      position: "absolute",
                      top: 50,
                      left: 20,
                      width: 60,
                      height: 30,
                      borderRadius: 14,
                      overflow: "hidden",
                      elevation: 5,
                      shadowColor: "black",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 3,
                      borderWidth: 1.5,
                      borderColor: "aqua",
                    }}
                    onPress={openSortModal}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Sort"
                    accessibilityHint="Sort your projects by priority"
                    accessibilityState={{ expanded: true }}
                  >
                    <LinearGradient
                      colors={["#00f7f7", "#005757"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: 12,
                      }}
                    >
                      <MaterialIcons name="sort" size={28} color="lightgrey" />
                    </LinearGradient>
                  </WalkthroughTouchableOpacity>
                </CopilotStep>
                {/* Sort Modal*/}

                <Modal
                  isVisible={sortModalVisible}
                  onBackdropPress={closeSortModal}
                  swipeDirection={["up", "down"]}
                  onSwipeComplete={closeSortModal}
                  style={{
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <SortModal
                    currentSort={sortOrder}
                    onSortChange={handleSortChange}
                    onClose={closeSortModal}
                  />
                </Modal>

                {/* Section to scroll the projects list with the scroll animation */}
                {projects.length > 0 ? (
                  <Animated.FlatList
                    style={{
                      flex: 1,
                      marginTop: "5%",
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
                    ref={flatListRef}
                    data={sortedProjects}
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
                      accessible
                      accessibilityLabel="You haven't any projects yet."
                      style={{
                        textAlign: "center",
                        color: "white",
                        fontSize: accessMode ? 20 : 18,
                        fontFamily: accessMode
                          ? "MPLUSLatin_Regular"
                          : "MPLUSLatin_ExtraLight",
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
                        backgroundColor: "#191919",
                      }}
                      placeholder={`Add new Project${dots}`}
                      placeholderTextColor={accessMode ? "white" : "grey"}
                      accessible={true}
                      importantForAccessibility="yes"
                      returnKeyType="next"
                      accessibilityLabel="Project input"
                      accessibilityHint="Enter the name of your project here."
                      editable={true}
                      onChangeText={(text) =>
                        setNewProjectName(sanitizeTitle(text))
                      }
                      maxLength={48}
                      value={newProjectName}
                    />

                    {/* Copilot tour for the HomeScreen step 2 */}
                    <CopilotStep
                      text="Enter the name of your project here."
                      order={2}
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

                  {/* Copilot tour for the HomeScreen step 3 */}
                  <CopilotStep
                    text="Add the project."
                    order={3}
                    name="Add Project"
                  >
                    {/* + Button to add a new project */}

                    <WalkthroughTouchableOpacity
                      onPress={handleAddProject}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Add Project"
                      accessibilityHint="Button to add a new project"
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        elevation: 5,
                        backgroundColor: "transparent",
                        shadowColor: "black",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 3,
                        borderWidth: 1.5,
                        borderColor: "aqua",
                      }}
                    >
                      <LinearGradient
                        colors={["#00f7f7", "#005757"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          flex: 1,
                          justifyContent: "center",
                          alignItems: "center",
                          borderRadius: 25,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 52,
                            fontWeight: "bold",
                            color: "lightgrey",
                            lineHeight: 42,
                            marginTop: 12,
                          }}
                        >
                          +
                        </Text>
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
                    onClose={() => setNoteModalVisible(false)}
                    loading={false}
                  />
                </Modal>
              </>
            )}
          </View>
        </CopilotProvider>
      </SafeAreaView>
    </DismissKeyboard>
  );
};

export default HomeScreen;
