/////////////////////////////////Time Tracking State Component//////////////////////////////////////

// in this component we manage the state of the time tracker, earnings calculator and update firestore data

// NOTE: "timer" is in the gobalState management the same like "elapsedTime" in the other files (it is only used to handle the calculation and timer logic management)
// the combination of timer and elapsedTime is necessary to correctly track time across multiple sessions. without timer, you would not be able to accumulate total running time properly if the timer is stopped and started multiple times.

////////////////////////////////////////////////////////////////////////////////////////////////////

import { create } from "zustand";
import { AppState } from "react-native";
import { getDoc, doc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { updateProjectData } from "../components/FirestoreService";
import { FIREBASE_FIRESTORE } from "../firebaseConfig";

////////////////////////////////////////////////////////////////////////////////////////////////////

export interface ProjectState {
  id: string;
  name: string;
  timer: number;
  isTracking: boolean;
  startTime: Date | null;
  pauseTime: Date | null;
  hourlyRate: number;
  elapsedTime: number;
  totalEarnings: number;
  projectName: string;
  originalStartTime: Date | null;
  lastStartTime: Date | null;
  endTime: Date | null;
  maxWorkHours: number;
}

interface TimeTrackingState {
  set: any;
  projects: { [key: string]: ProjectState };
  currentProjectId: string | null;
  rateInput: string;
  appState: string;
  isInitialized: boolean;
  isTracking: boolean;
  calculateEarnings: (projectId: string | number) => void;
  setProjectId: (projectId: string) => void;
  startTimer: (projectId: string) => void;
  stopTimer: (projectId: string) => void;
  pauseTimer: (projectId: string) => void;
  updateTimer: (projectId: string, time: number) => void;
  setHourlyRate: (projectId: string, rate: number) => void;
  setTotalEarnings: (projectId: string, earnings: number) => void;
  resetAll: (projectId: string) => void;
  getProjectState: (projectId: string) => ProjectState | undefined;
  setRateInput: (rate: string) => void;
  setAppState: (state: string) => void;
  setIsInitialized: (value: boolean) => void;
  getProjectTrackingState(projectId: string | null): unknown;
  getProjectId: () => string | null;
  setProjectData: (
    projectId: string,
    projectData: Partial<ProjectState>
  ) => void;
  setProjectTime: (field: keyof ProjectState, value: any) => void;
  setLastStartTime: (projectId: string, time: Date | null) => void; // Anpassung hier
  setOriginalStartTime: (projectId: string, time: Date | null) => void;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////

export const useStore = create<TimeTrackingState>((set, get) => ({
  // projects state
  projects: {},
  currentProjectId: null,
  totalEarnings: 0,
  lastStartTime: null,
  originalStartTime: null,
  endTime: null,
  set,
  // options to handle AppState
  rateInput: "", // globale RateInput
  setRateInput: (rate) => set(() => ({ rateInput: rate })),

  appState: AppState.currentState, // globale AppState
  setAppState: (state) => set(() => ({ appState: state })),

  isInitialized: false, // globale Initialized-state
  setIsInitialized: (value) => set(() => ({ isInitialized: value })),

  // function to set data from Firestore if app starts up
  isTracking: false,
  setProjectTime: (field: keyof ProjectState, value: unknown) => {
    set((state) => ({
      projects: {
        ...state.projects,
        [state.currentProjectId!]: {
          ...state.projects[state.currentProjectId!],
          [field]: value,
        },
      },
    }));
  },

  // function to fetch data from Firestore if user navigate to details screen
  setProjectData: (projectId, projectData) => {
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: { ...state.projects[projectId], ...projectData },
      },
    }));
  },

  // function to set the current project id
  setProjectId: (projectId) => {
    set(() => ({
      currentProjectId: projectId,
    }));
  },

  // function to get the current project id
  getProjectId: () => {
    return get().currentProjectId;
  },

  // function to get the project state
  getProjectState: (projectId) => {
    return get().projects[projectId];
  },

  // function to set the last start time
  setLastStartTime: (projectId, time) =>
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          lastStartTime: time,
        },
      },
    })),

  // function to set the original start time
  setOriginalStartTime: (projectId, time) =>
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          originalStartTime: time,
        },
      },
    })),

  // function to calculate the total earnings
  calculateEarnings: (projectId: string | number) => {
    const project = get().projects[projectId];
    if (project && project.startTime && project.hourlyRate > 0) {
      const currentTime = new Date().getTime();
      const startTime = project.startTime.getTime();
      const elapsedTime = (currentTime - startTime) / 1000; // in seconds
      const totalTime = project.timer + elapsedTime; // total time includes previous timer value

      // calculate earnings based on total time and hourly rate
      const earnings = (totalTime / 3600) * project.hourlyRate;

      set((state) => ({
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            totalEarnings: earnings,
          },
        },
      }));
    } else {
      console.warn(
        "Cannot calculate earnings: either project not found or hourly rate is 0"
      );
    }
  },

  // function to start the timer and inform the user when a project is already being tracked
  startTimer: async (projectId: string) => {
    const state = get();
    const project = state.projects[projectId];
    // check if project is already being tracked
    if (project.isTracking) {
      console.warn("Project is already being tracked");
      return;
    }
    // set originalStartTime only if it´s the first time the timer starts
    const updatedOriginalStartTime = project.originalStartTime || new Date();
    // else set lastStartTime when timer is > 0
    const updatedLastStartTime = project.timer > 0 ? new Date() : null;
    // update UI
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...project,
          startTime: new Date(),
          originalStartTime: updatedOriginalStartTime,
          lastStartTime: updatedLastStartTime,
          isTracking: true,
          pauseTime: null,
        },
      },
    }));
    // update firestore
    await updateProjectData(projectId, {
      startTime: new Date(),
      originalStartTime: updatedOriginalStartTime,
      lastStartTime: updatedLastStartTime,
      isTracking: true,
    });
  },

  // function to stop the timer and calculate the elapsed time
  stopTimer: async (projectId: string) => {
    const state = get(); // call current state
    const project = state.projects[projectId];

    // check if project is being tracked
    if (!project.isTracking) {
      console.warn("Project is not being tracked");
      return;
    }

    // check if start time is set
    if (!project.startTime) {
      console.warn(
        "startTime is not set. Cannot stop timer. Please start the timer first."
      );
      return;
    }

    const startTime =
      project.startTime instanceof Date
        ? project.startTime
        : new Date(project.startTime); // if startTime is a Timestamp, convert it to Date type
    // Timestamp is a firestore type and needs to be converted to Date type if all other calculations uses Datae type

    // calculate elapsed time after the last startTime was set
    const elapsedTime = Math.round(
      (new Date().getTime() - startTime.getTime()) / 1000
    ); // in secunds
    // calculate final elapsed time based on project.timer if it is set
    const finalElapsedTime = Math.round(project.timer || 0);
    // calculate earnings based on finalElapsedTime and hourly rate
    const earnings = parseFloat(
      ((finalElapsedTime / 3600) * project.hourlyRate).toFixed(2)
    );

    // update UI
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...project,
          isTracking: false,
          endTime: new Date(),
          timer: finalElapsedTime, // rounde den timer
          totalEarnings: earnings,
          startTime: null,
          pauseTime: null,
        },
      },
    }));

    // console.log("StopTimer: State updated with final timer:", finalElapsedTime);

    try {
      // update firestore
      await updateProjectData(projectId, {
        isTracking: false,
        timer: finalElapsedTime, // round the timer
        endTime: new Date(),
        elapsedTime: finalElapsedTime, // round elapsed time with finalElapsedTime
        totalEarnings: earnings, // updated earnings
        pauseTime: null,
        lastSession: new Date(),
        originalStartTime: project.originalStartTime || project.startTime,
      });

      // console.log("StopTimer: Firestore update successful");
    } catch (error) {
      console.error("Error updating Firestore in stopTimer:", error);
    }
  },

  // function to pause the timer and calculate the elapsed time
  pauseTimer: (projectId) => {
    set((state) => {
      const project = state.projects[projectId];

      if (!project.startTime) {
        console.warn("startTime is not set. Cannot pause timer.");
        return state;
      }

      // calculate elapsed time after the last startTime was set
      const elapsedTime =
        (new Date().getTime() - project.startTime.getTime()) / 1000;

      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            isTracking: false,
            timer: elapsedTime,
            endTime: new Date(),
            startTime: null, // set startTime to null to indicate that the timer is paused
          },
        },
      };
    });
  },

  // statefunction to update the timer in the TimeTrackerCard
  updateTimer: (projectId, time) => {
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          timer: time,
        },
      },
    }));
  },

  // statefunction to set the hourly rate in the EarningsCalculatorCard
  setHourlyRate: (projectId, rate) => {
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          hourlyRate: rate,
        },
      },
    }));
  },

  // statefunction to set the total earnings in the EarningsCalculatorCard
  setTotalEarnings: (projectId, earnings) => {
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          totalEarnings: earnings,
        },
      },
    }));
  },

  // function to get the project tracking state in the TimeTrackerCard using snapshot from firebase
  getProjectTrackingState: async (projectId: string) => {
    const user = getAuth().currentUser; // gets the current user from firebase
    if (!user) {
      console.error("User is not authenticated.");
      return false;
    }
    if (!projectId) {
      return false;
    }

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
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const projectData = docSnap.data();
        return projectData.isTracking || false;
      } else {
        console.error("Error fetching project data:", docSnap);
        return false;
      }
    } catch (error) {
      console.error("Error fetching project data:", error);
      return false;
    }
  },

  // statefunction to reset all properties of a project
  resetAll: async (projectId) => {
    set((state) => {
      const project = state.projects[projectId];

      if (!project) {
        return state; // if projecte is not existing, do nothing
      }

      // reset UI properties
      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...project, // hold all existing properties of the project
            isTracking: false,
            startTime: null,
            pauseTime: null,
            endTime: null,
            hourlyRate: 0,
            elapsedTime: 0,
            totalEarnings: 0,
            timer: 0,
            maxWorkHours: 0,
            lastStartTime: null,
            originalStartTime: null,
          },
        },
      };
    });

    // reset firestore properties
    try {
      await updateProjectData(projectId, {
        isTracking: false,
        startTime: null,
        pauseTime: null,
        endTime: null,
        hourlyRate: 0,
        elapsedTime: 0,
        totalEarnings: 0,
        timer: 0,
        lastSession: 0,
        maxWorkHours: 0,
        lastStartTime: null,
        originalStartTime: null,
      });
    } catch (error) {
      console.error("Error resetting project data:", error);
    }
  },
}));
