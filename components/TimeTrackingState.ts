/////////////////////////////////Time Tracking State Component//////////////////////////////////////

// in this component we manage the state of the time tracker, earnings calculator and update firestore data

// NOTE: "timer" is in the gobalState management the same like "elapsedTime" in the other files (it is only used to handle the calculation and timer logic management)
// the combination of timer and elapsedTime is necessary to correctly track time across multiple sessions. without timer, you would not be able to accumulate total running time properly if the timer is stopped and started multiple times.

import { create } from "zustand";
import { Alert, AppState } from "react-native";
import { updateProjectData } from "../components/FirestoreService";
import { getDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import useEffect from "react";
///////////////////////////////////////////////////////////////////////////////////////////

interface ProjectState {
  timer: number;
  isTracking: boolean;
  startTime: Date | null;
  pauseTime: Date | null;
  endTime: Date | null;
  hourlyRate: number;
  elapsedTime: number;
  totalEarnings: number;
  projectName: string;
  originalStartTime: Date | null;
  lastStartTime: Date | null;
}

interface TimeTrackingState {
  projects: { [key: string]: ProjectState };
  currentProjectId: string | null;
  rateInput: string;
  appState: string;
  isInitialized: boolean;

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
}

////////////////////////////////////////////////////////////////////////////////////////////

export const useStore = create<TimeTrackingState>((set, get) => ({
  // projects state
  projects: {},
  currentProjectId: null,

  // options to handle AppState
  rateInput: "", // globale RateInput
  setRateInput: (rate) => set(() => ({ rateInput: rate })),

  appState: AppState.currentState, // globale AppState
  setAppState: (state) => set(() => ({ appState: state })),

  isInitialized: false, // globale Initialized-state
  setIsInitialized: (value) => set(() => ({ isInitialized: value })),

  // function to calculate the total earnings
  calculateEarnings: (projectId: string | number) => {
    const project = get().projects[projectId];
    if (project && project.startTime) {
      const elapsedTime =
        (new Date().getTime() - project.startTime.getTime()) / 1000;
      const totalTime = project.timer + elapsedTime;
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
    }
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

  // function to start the timer and inform the user when a project is already being tracked
  startTimer: async (projectId: string) => {
    const state = get(); // get the current state
    const project = state.projects[projectId];

    if (!project) {
      console.warn("Project not found.");
      return;
    }

    // add the originalStartTime to the project if it is the first setting
    let updatedOriginalStartTime = project.originalStartTime;
    if (!project.originalStartTime) {
      updatedOriginalStartTime = new Date();
    }

    // add the lastStartTime to the project if it is not set the first time
    const updatedLastStartTime = project.timer > 0 ? new Date() : null;

    // update the project data in Firestore
    await updateProjectData(projectId, {
      startTime: new Date(),
      originalStartTime: updatedOriginalStartTime,
      lastStartTime: updatedLastStartTime,
      isTracking: true,
    });

    // update the UI state with the new values
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...project,
          startTime: new Date(),
          originalStartTime: updatedOriginalStartTime,
          lastStartTime: updatedLastStartTime,
          isTracking: true,
        },
      },
    }));
  },

  // function to stop the timer and calculate the elapsed time
  stopTimer: async (projectId: string) => {
    const state = get(); // get the current state
    const project = state.projects[projectId];

    if (!project || !project.startTime) {
      console.warn("Start time is not set. Cannot stop timer.");
      return;
    }

    // calculate the elapsed time after the last startTime was set
    const elapsedTime =
      (new Date().getTime() - project.startTime.getTime()) / 1000; // in Sekunden

    // set the new timer value to the elapsed time
    const updatedTimer = elapsedTime;

    // update the state with the new values
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...project,
          isTracking: false,
          timer: updatedTimer, // use the updated timer value
          endTime: new Date(),
          startTime: null,
          pauseTime: null,
        },
      },
    }));

    console.log(
      "StopTimer: State updated with new timer:",
      project.timer + elapsedTime
    );

    setTimeout(async () => {
      try {
        await updateProjectData(projectId, {
          isTracking: false,
          timer: project.timer + elapsedTime,
          endTime: new Date(),
          lastSession: new Date().getTime(),
          startTime: project.startTime,
          pauseTime: null,
        });
        set((state) => ({
          projects: {
            ...state.projects,
            [projectId]: {
              ...project,
              endTime: new Date(),
              lastSession: elapsedTime,
              originalStartTime: project.originalStartTime || project.startTime,
              isTracking: false,
            },
          },
        }));
        console.log("StopTimer: Firestore update successful");
      } catch (error) {
        console.error("Error updating Firestore in stopTimer:", error);
      }
    }, 500);
  },

  // function to pause the timer and calculate the elapsed time
  pauseTimer: (projectId) => {
    set((state) => {
      const project = state.projects[projectId];

      if (!project.startTime) {
        console.warn("Start time is not set. Cannot pause timer.");
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

  getProjectTrackingState: async (projectId: string) => {
    if (!projectId) {
      return false;
    }

    try {
      const docRef = doc(
        FIREBASE_FIRESTORE,
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
            lastStartTime: null,
            originalStartTime: null,
          },
        },
      };
    });

    // reset Firestore properties
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
        lastStartTime: null,
        originalStartTime: null,
      });
    } catch (error) {
      console.error("Error resetting project data:", error);
    }
  },
}));
