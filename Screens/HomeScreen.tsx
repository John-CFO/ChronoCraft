///////////////////////////////////// HomeSceen Component ////////////////////////////////////////////

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
import { doc, getDoc } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import {
  CopilotProvider,
  CopilotStep,
  walkthroughable,
} from "react-native-copilot";

import {
  FIREBASE_FIRESTORE,
  FIREBASE_AUTH,
  FIREBASE_APP,
} from "../firebaseConfig";
import { RootStackParamList } from "../navigation/RootStackParams";
import {
  fetchProjects as fetchProjectsApi,
  deleteProject as deleteProjectApi,
  createProject as createProjectApi,
} from "../services/projects.api";
import ProjectListItem from "../components/projectListItem";
import { Project } from "../components/types/Project";
import { sortProjects } from "../components/utils/sortProjects";
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
import { logError } from "../lib/loggerClient";

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
  const [canReadProjects, setCanReadProjects] = useState<boolean | null>(null);

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
  const { serviceId, loading: serviceLoading } = useService();

  // initialize the project id globally to reset all components in the details screen
  const { setProjectId } = useStore();

  // handle project state with props title, id, name and createdAt
  const [projects, setProjects] = useState<Project[]>([]);

  // new project name state
  const [newProjectName, setNewProjectName] = useState("");

  // state to handel sort modal
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // sort order state
  const [sortOrder, setSortOrder] = useState("DATE_DESC");

  const openSortModal = () => {
    setSortModalVisible(true);
  };

  const closeSortModal = () => {
    setSortModalVisible(false);
  };

  // function to sort the projects
  const sortedProjects = React.useMemo(() => {
    return sortProjects(projects, sortOrder);
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

  const [lastItemHeight, setLastItemHeight] = useState(ITEM_HEIGHT);

  // Gatecheck to check if the user can read the projects
  useEffect(() => {
    if (serviceLoading) return;
    if (!serviceId) {
      setCanReadProjects(false);
      return;
    }

    let active = true;

    const check = async () => {
      const user = FIREBASE_AUTH.currentUser;

      if (!user) {
        if (active) setCanReadProjects(false);
        return;
      }

      if (active) setCanReadProjects(null);

      try {
        const serviceRef = doc(
          FIREBASE_FIRESTORE,
          "Users",
          user.uid,
          "Services",
          serviceId,
        );

        const snap = await getDoc(serviceRef);

        if (!active) return;

        setCanReadProjects(snap.exists());
      } catch (err) {
        if (active) setCanReadProjects(false);
      }
    };

    check();

    return () => {
      active = false;
    };
  }, [serviceId, serviceLoading]);

  // function to load data from firestore
  useEffect(() => {
    if (serviceLoading) return;
    if (canReadProjects === null) return;

    let active = true;

    const loadProjects = async () => {
      const user = FIREBASE_AUTH.currentUser;

      if (!serviceId || !user) {
        if (active) setIsLoading(false);
        return;
      }

      if (canReadProjects === false) {
        if (active) setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const projects = await fetchProjectsApi(serviceId);

        if (!active) return;

        setProjects(projects);
      } catch (err) {
        logError("HomeScreen/fetchProjects", err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadProjects();

    return () => {
      active = false;
    };
  }, [serviceId, serviceLoading, canReadProjects, refresh]);

  // function to add projects
  const handleAddProject = async () => {
    const user = FIREBASE_AUTH.currentUser;

    if (!user?.uid) return;

    if (!serviceId) {
      useAlertStore
        .getState()
        .showAlert(
          "Error",
          "serviceId is missing. ServiceContext is not ready.",
        );
      return;
    }

    const trimmedName = newProjectName.trim();

    if (!trimmedName) {
      useAlertStore
        .getState()
        .showAlert("Sorry", "Add a project title first to continue.");
      return;
    }

    if (trimmedName.length > 100) {
      useAlertStore.getState().showAlert("Error", "Project name too long");
      return;
    }

    try {
      const data = await createProjectApi(serviceId, trimmedName);

      const projectForState = {
        id: data.projectId,
        userId: user.uid,
        name: trimmedName,
        createdAt: new Date(),
        timer: 0,
        elapsedTime: 0,
        hourlyRate: 0,
        totalEarnings: 0,
        isTracking: false,
        startTime: null,
        endTime: null,
        lastStartTime: null,
        originalStartTime: null,
      };

      setProjects((prev) => [...prev, projectForState]);
      setNewProjectName("");
      setRefresh((r) => !r);
      Keyboard.dismiss();
    } catch (error) {
      logError("HomeScreen/createProject", error);
      useAlertStore.getState().showAlert("Error", "Could not add project.");
    }
  };

  // function to delete projects
  const handleDeleteProject = async (projectId: string) => {
    useAlertStore
      .getState()
      .showAlert(
        "Attention!",
        "Do you really want to delete the project? If you delete the project, all notes will be deleted as well.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const user = FIREBASE_AUTH.currentUser;

                if (!user?.uid || !serviceId) return;

                const ref = animationRefs.current[projectId];

                if (ref) {
                  await ref.zoomOut(300);
                }

                await deleteProjectApi(serviceId, projectId);

                setProjects((prev) => prev.filter((p) => p.id !== projectId));

                setRefresh((prev) => !prev);
              } catch (err) {
                logError("HomeScreen/deleteProject", err);
              }
            },
          },
        ],
      );
  };

  // function to navigate to the details screen if user pressed an a listed project
  const handleProjectPress = (projectId: string, projectName: string) => {
    setProjectId(projectId); // to send it global to the details screen to reset all components in the details screen
    navigation.navigate("Details", { projectId, projectName });
  };

  // function to handle sorting
  const handleSortChange = (newSort: string) => {
    setSortOrder(newSort);
  };

  // function to show the note-modal
  const openNoteModal = (projectId: string) => {
    setSelectedProjectId(projectId);
    setNoteModalVisible(true);
  };

  // function to close the note-modal
  const closeNoteModal = () => {
    setNoteModalVisible(false);
  };

  // define the dot animation with a delay
  const dots = useDotAnimation(loading, 700);

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  // scroll animation with parameters to handle the scroll animation
  const renderItem = React.useCallback(
    ({ item, index }: { item: Project; index: number }) => (
      <ProjectListItem
        item={item}
        index={index}
        ITEM_HEIGHT={ITEM_HEIGHT}
        scrollY={scrollY}
        accessMode={accessMode}
        animationRef={(id, ref) => {
          if (ref) animationRefs.current[id] = ref;
        }}
        onPress={handleProjectPress}
        onDelete={handleDeleteProject}
        onAddNote={openNoteModal}
        setLastItemHeight={setLastItemHeight}
      />
    ),
    [scrollY, accessMode],
  );

  // hook to check Firestore if the user has seen the Copilot home tour
  const fetchTourStatus = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const docRef = doc(FIREBASE_FIRESTORE, "Users", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      setShowTourCard(data.hasSeenHomeTour === false);
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
    }, []),
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
                      { useNativeDriver: true },
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
