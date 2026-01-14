/////////////////////////////////Time Tracking State Component//////////////////////////////////////

// in this component we manage the state of the time tracker, earnings calculator and update firestore data

// NOTE: "timer" is in the gobalState management the same like "elapsedTime" in the other files (it is only used to handle the calculation and timer logic management)
// the combination of timer and elapsedTime is necessary to correctly track time across multiple sessions. without timer, you would not be able to accumulate total running time properly if the timer is stopped and started multiple times.

////////////////////////////////////////////////////////////////////////////////////////////////////

import { create } from "zustand";
import { AppState } from "react-native";
import { getDoc, doc, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { updateProjectData } from "../components/FirestoreService";
import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useService } from "../components/contexts/ServiceContext";

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
  startTimeTimestamp: Timestamp | null;
  isRestoring: boolean;
}

export interface TimeTrackingState {
  setTimerAndEarnings: any;
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
  setIsTracking: (value: boolean) => void;
  getProjectTrackingState(projectId: string | null): unknown;
  getProjectId: () => string | null;
  setProjectData: (
    projectId: string,
    projectData: Partial<ProjectState>
  ) => void;
  setProjectTime: (field: keyof ProjectState, value: any) => void;
  setLastStartTime: (projectId: string, time: Date | null) => void;
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

  setIsTracking: (value: boolean) =>
    set(() => ({
      isTracking: value,
    })),

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

  // function to set data from Firestore
  setProjectData: (projectId: string, incoming: Partial<ProjectState>) => {
    set((state) => {
      const prev = state.projects[projectId] || {};

      // DEBUG: incoming + caller stack (temporary)
      // console.log(`[STORE][setProjectData:${projectId}] incoming:`, incoming, {
      //   stack: new Error().stack?.split("\n").slice(2, 6),
      // });

      // copy prev to start merge
      const merged: any = { ...prev };

      // always merge safe fields
      const safeKeys = [
        "name",
        "hourlyRate",
        "createdAt",
        "startTime",
        "endTime",
        "originalStartTime",
        "lastStartTime",
        "pauseTime",
        "maxWorkHours",
        "uid",
        "isTracking",
        // add other safe fields you want to accept blindly
      ];
      for (const k of safeKeys) {
        if (k in incoming) merged[k] = (incoming as any)[k];
      }

      // RULE A: if currently restoring, KEEP local timer/earnings — don't accept incoming timers
      if (prev.isRestoring) {
        // keep prev.timer and prev.totalEarnings
        merged.timer = prev.timer ?? 0;
        merged.totalEarnings = prev.totalEarnings ?? 0;
      } else {
        // RULE B: if incoming timer is obviously stale (0) but prev has a higher running timer, prefer prev
        const incomingTimer =
          typeof (incoming as any).timer === "number"
            ? (incoming as any).timer
            : undefined;
        const incomingEarnings =
          typeof (incoming as any).totalEarnings === "number"
            ? (incoming as any).totalEarnings
            : undefined;

        if (typeof incomingTimer === "number") {
          if (
            prev.isTracking &&
            prev.timer != null &&
            incomingTimer < prev.timer
          ) {
            // incoming is older/stale — keep prev
            merged.timer = prev.timer;
          } else {
            merged.timer = incomingTimer;
          }
        } else {
          merged.timer = prev.timer ?? 0;
        }

        if (typeof incomingEarnings === "number") {
          if (
            prev.isTracking &&
            prev.totalEarnings != null &&
            incomingEarnings < prev.totalEarnings
          ) {
            merged.totalEarnings = prev.totalEarnings;
          } else {
            merged.totalEarnings = incomingEarnings;
          }
        } else {
          merged.totalEarnings = prev.totalEarnings ?? 0;
        }
      }

      // RULE C: merge any other incoming fields that are not risky
      for (const [k, v] of Object.entries(incoming)) {
        if (["timer", "totalEarnings"].includes(k)) continue; // already handled
        if (safeKeys.includes(k)) continue; // already handled
        merged[k] = v;
      }

      // ensure we clear isRestoring if incoming explicitly sets it false
      if ("isRestoring" in incoming)
        merged.isRestoring = (incoming as any).isRestoring;

      // avoid unnecessary setState
      const prevJson = JSON.stringify(prev);
      const mergedJson = JSON.stringify(merged);
      if (prevJson === mergedJson) return state;

      return {
        projects: {
          ...state.projects,
          [projectId]: merged,
        },
      };
    });
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
      const currentTime = Date.now();
      const startTime = project.startTime?.getTime() ?? 0;
      const elapsedTime = (currentTime - startTime) / 1000;
      const totalTime = (project.timer ?? 0) + elapsedTime;
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

  // function to start the timer and inform the user when a project is already being tracked
  startTimer: async (projectId: string, { silent = false } = {}) => {
    const state = get();
    const project = state.projects[projectId];

    const effectiveSilent = silent || !!project?.isRestoring;

    if (project?.isTracking) {
      if (!effectiveSilent) {
        console.warn(`[STORE] Project ${projectId} is already tracked`);
      }
      return;
    }

    const now = new Date();
    const updatedOriginalStartTime = project.originalStartTime || now;
    const updatedLastStartTime =
      project.timer > 0 && !silent ? now : project.lastStartTime;
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...project,
          startTime: now,
          originalStartTime: updatedOriginalStartTime,
          lastStartTime: updatedLastStartTime,
          isTracking: true,
          pauseTime: null,
        },
      },
    }));

    try {
      await updateProjectData(projectId, {
        originalStartTime: updatedOriginalStartTime,
        startTime: now,
        lastStartTime: updatedLastStartTime,
        isTracking: true,
        pauseTime: null,
      });
    } catch (error) {
      console.error("Error updating Firestore on startTimer:", error);
    }
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
        lastStartTime: project.startTime || project.lastStartTime,
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
    // console.log(
    //   `[STORE:${projectId}] setTotalEarnings ->`,
    //   earnings,
    //   new Error().stack?.split("\n").slice(2, 6)
    // );
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

  // function to set the timer and earnings in the TimeTrackerCard (AppState and Hardkill)
  // to get a source of truth
  setTimerAndEarnings: (
    projectId: string,
    timer: number,
    totalEarnings: number
  ) =>
    set((state) => {
      // console.log(
      //   `[STORE][setTimerAndEarnings:${projectId}] timer=${timer}, earnings=${totalEarnings}`,
      //   {
      //     stack: new Error().stack?.split("\n").slice(2, 6),
      //   }
      // );

      const prev = state.projects[projectId] || {};
      if (prev.timer === timer && prev.totalEarnings === totalEarnings)
        return state;

      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...prev,
            timer,
            totalEarnings,
          },
        },
      };
    }),

  // function to get the project tracking state in the TimeTrackerCard using snapshot from firebase
  getProjectTrackingState: async (projectId: string) => {
    const { serviceId } = useService();
    if (!serviceId) return;
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
        serviceId,
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
