/////////////////////////////////Time Tracking State Component//////////////////////////////////////

// in this component we manage the state of the time tracker, earnings calculator and update firestore data

// NOTE: "timer" is in the gobalState management the same like "elapsedTime" in the other files (it is only used to handle the calculation and timer logic management)
// the combination of timer and elapsedTime is necessary to correctly track time across multiple sessions. without timer, you would not be able to accumulate total running time properly if the timer is stopped and started multiple times.

import { create } from "zustand";
import { Alert } from "react-native";

import { updateProjectData } from "../components/FirestoreService";
import { getDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { FIREBASE_FIRESTORE } from "../firebaseConfig";
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
  setProjectId: (projectId: string) => void;
  startTimer: (projectId: string) => void;
  stopTimer: (projectId: string) => void;
  pauseTimer: (projectId: string) => void;
  resetTimer: (projectId: string) => void;
  updateTimer: (projectId: string, time: number) => void;
  setHourlyRate: (projectId: string, rate: number) => void;
  setTotalEarnings: (projectId: string, earnings: number) => void;
  resetAll: (projectId: string) => void;
  getProjectState: (projectId: string) => ProjectState | undefined;
}

////////////////////////////////////////////////////////////////////////////////////////////

export const useStore = create<TimeTrackingState>((set, get) => ({
  projects: {},
  currentProjectId: null,

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
  setProjectId: (projectId) => {
    set((state) => ({
      currentProjectId: projectId,
    }));
  },

  // function to start the timer and inform the user when a project is already being tracked
  startTimer: async (projectId: string) => {
    const state = get(); // Aktuellen Zustand holen
    const project = state.projects[projectId];

    if (!project) {
      console.warn("Project not found.");
      return;
    }

    // Wenn der Timer zum ersten Mal gestartet wird, setze originalStartTime
    let updatedOriginalStartTime = project.originalStartTime;
    if (!project.originalStartTime) {
      updatedOriginalStartTime = new Date();
    }

    // lastStartTime wird nur gesetzt, wenn der Timer erneut gestartet wird (also wenn timer > 0 ist)
    const updatedLastStartTime = project.timer > 0 ? new Date() : null;

    // Update Firestore mit den neuen Werten
    await updateProjectData(projectId, {
      startTime: new Date(),
      originalStartTime: updatedOriginalStartTime,
      lastStartTime: updatedLastStartTime,
      isTracking: true,
    });

    // Aktualisiere den Zustand des Projekts im State
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
    const state = get(); // Aktuellen Zustand holen
    const project = state.projects[projectId];

    if (!project || !project.startTime) {
      console.warn("Start time is not set. Cannot stop timer.");
      return;
    }

    // Berechne die verstrichene Zeit seit dem letzten Start
    const elapsedTime =
      (new Date().getTime() - project.startTime.getTime()) / 1000; // in Sekunden

    // Setze den neuen Timer-Wert auf die verstrichene Zeit
    const updatedTimer = elapsedTime;

    // Update Firestore, um den Timer und den Tracking-Status zu speichern
    await updateProjectData(projectId, {
      timer: updatedTimer,
      isTracking: false,
      endTime: new Date(),
      startTime: null, // Setze startTime zurück, da der Timer gestoppt wurde
      pauseTime: null,
    });

    // Aktualisiere den Zustand des Projekts im State
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...project,
          isTracking: false,
          timer: updatedTimer, // Verwende die verstrichene Zeit als neuen Timer-Wert
          endTime: new Date(),
          startTime: null,
          pauseTime: null,
        },
      },
    }));
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

  // function to reset the timer and calculator in UI and firestore
  resetTimer: (projectId) => {
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          isTracking: false,
          startTime: null,
          pauseTime: null,
          endTime: null,
          elapsedTime: 0,
          timer: 0,
          lastStartTime: null,
          originalStartTime: null,
        },
      },
    }));

    updateProjectData(projectId, {
      isTracking: false,
      startTime: null,
      pauseTime: null,
      endTime: null,
      elapsedTime: 0,
      timer: 0,
      lastStartTime: null,
      originalStartTime: null,
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

  // statefunction to reset all properties of a project
  resetAll: async (projectId) => {
    set((state) => {
      const project = state.projects[projectId];

      if (!project) {
        return state; // if projecte is not existing, do nothing
      }

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
        lastStartTime: null,
        originalStartTime: null,
      });
    } catch (error) {
      console.error("Error resetting project data:", error);
    }
  },

  getProjectState: (projectId) => {
    return get().projects[projectId];
  },
}));
