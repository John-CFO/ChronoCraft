/////////////////////////////////Time Tracking State Component//////////////////////////////////////

// in this component we manage the state of the time tracker, earnings calculator and update firestore data

// NOTE: "timer" is in the gobalState management the same like "elapsedTime" in the other files (to handle the calculation)

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

  calculateearnings: (projectId: string | number) => {
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
    const state = get(); // Verwende get() um den aktuellen Zustand zu bekommen, statt set()

    const project = state.projects[projectId];

    if (!project) {
      console.warn("Project not found.");
      return;
    }

    // Prüfe, ob das aktuelle Projekt bereits läuft
    if (project.isTracking) {
      console.warn("Project is already being tracked.");
      return;
    }

    // Prüfe, ob es ein anderes Projekt gibt, das bereits getrackt wird
    const activeProjectId = Object.keys(state.projects).find(
      (id) => state.projects[id].isTracking
    );

    if (activeProjectId && activeProjectId !== projectId) {
      const activeProject = state.projects[activeProjectId];
      const activeProjectName = activeProject
        ? activeProject.projectName
        : "Unknown Project";

      Alert.alert(
        "Tracking in Progress",
        `Please stop or pause the current project "${activeProjectName}" before starting a new one.`,
        [{ text: "OK" }]
      );

      return;
    }

    // Falls elapsedTime 0 ist, setze den Startzeitpunkt in Firestore
    if (project.timer === 0) {
      const newStartTime = new Date();
      try {
        await updateProjectData(projectId, {
          startTime: newStartTime,
          isTracking: true,
        });
        console.log("Firestore successfully updated with new startTime.");

        // Zustand erst aktualisieren nachdem Firestore Update abgeschlossen ist
        set((state) => ({
          projects: {
            ...state.projects,
            [projectId]: {
              ...project,
              isTracking: true,
              startTime: newStartTime,
            },
          },
        }));
      } catch (error) {
        console.error("Error updating Firestore:", error);
      }
    } else {
      const newStartTime = project.startTime || new Date();
      set((state) => ({
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            isTracking: true,
            startTime: newStartTime,
          },
        },
      }));
    }
  },

  // function to stop the timer and calculate the elapsed time

  stopTimer: async (projectId: string) => {
    const state = get(); // Verwende get() um den aktuellen Zustand zu bekommen, statt set()

    const project = state.projects[projectId];

    if (!project.startTime) {
      console.warn("Start time is not set. Cannot stop timer.");
      return;
    }

    const elapsedTime =
      (new Date().getTime() - project.startTime.getTime()) / 1000;

    // Stop the timer and update Firestore asynchronously
    try {
      await updateProjectData(projectId, {
        isTracking: false,
        timer: elapsedTime,
        endTime: new Date(),
        startTime: null,
        pauseTime: null,
      });

      // Zustand erst aktualisieren nachdem Firestore Update abgeschlossen ist
      set((state) => ({
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            isTracking: false,
            timer: elapsedTime,
            endTime: new Date(),
            startTime: null,
            pauseTime: null,
          },
        },
      }));
    } catch (error) {
      console.error("Error stopping timer:", error);
    }
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
        },
      },
    }));

    updateProjectData(projectId, {
      isTracking: false,
      startTime: null,
      pauseTime: null,
      endTime: null,
      elapsedTime: 0,
    });
  },

  /*
  updateTimer: (projectId, time) => {
    set((state) => {
      const project = state.projects[projectId];
      const updatedTimer = time;

      // Calculate earnings based on updated timer and hourly rate
      const earnings = ((updatedTimer / 3600) * project.hourlyRate).toFixed(2);

      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            timer: updatedTimer,
            totalEarnings: parseFloat(earnings),
          },
        },
      };
    });
  }, */

  // statefunction to update the timer in the state
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

  // statefunction to set the hourly rate in the state
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

  // statefunction to set the total earnings in the state
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
      });
    } catch (error) {
      console.error("Error resetting project data:", error);
    }
  },

  getProjectState: (projectId) => {
    return get().projects[projectId];
  },
}));
