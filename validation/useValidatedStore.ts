//////////////////////// useValidatedStore.ts ////////////////////////////////////

// This file contains the validated actions for the global timetracking state

////////////////////////////////////////////////////////////////////////////////

import { UseBoundStore, StoreApi } from "zustand";
import { getAuth } from "firebase/auth";

import {
  ProjectState,
  useStore as originalUseStore,
  TimeTrackingState,
} from "../components/TimeTrackingState";
import {
  validateSetProjectData,
  validateTimerAndEarnings,
  isValidProjectId,
} from "./timeTrackingStateSchemas";

//////////////////////////////////////////////////////////////////////////////////

// Test-Hook Override
let useStore: UseBoundStore<StoreApi<TimeTrackingState>> = originalUseStore;

/**
 * Only for Tests: Injected a Mock-Store.
 */
export const __setUseStoreForTest = (mock: Partial<TimeTrackingState>) => {
  // Typecast, so TS knows, that mock is compatible
  useStore = (() => mock) as unknown as UseBoundStore<
    StoreApi<TimeTrackingState>
  >;
};

// Hook
export const useValidatedStore = () => {
  const store = useStore() as TimeTrackingState;

  const setProjectData = (
    projectId: string,
    projectData: Partial<ProjectState>,
  ) => {
    if (!isValidProjectId(projectId)) {
      throw new Error(`Invalid projectId format: ${projectId}`);
    }
    const uid = projectData.uid;
    const validatedData = validateSetProjectData({
      projectId,
      projectData,
      uid,
    });
    store.setProjectData(validatedData.projectId, validatedData.projectData);
  };

  const setTimerAndEarnings = (
    projectId: string,
    timer: number,
    totalEarnings: number,
  ) => {
    const uid = getAuth().currentUser?.uid;

    console.log("SET_TIMER_AND_EARNINGS DEBUG (RAW)", {
      projectId,
      timer,
      totalEarnings,
      uid,
      currentUser: store.currentUser,
    });

    if (!uid) {
      console.error("CRITICAL: Missing uid in setTimerAndEarnings");
      return;
    }

    const validatedData = validateTimerAndEarnings({
      projectId,
      timer,
      totalEarnings,
      uid,
    });

    store.setTimerAndEarnings(
      validatedData.projectId,
      validatedData.timer,
      validatedData.totalEarnings,
    );
  };
  const setTimerAndEarningsLight = (
    projectId: string,
    timer: number,
    totalEarnings: number,
  ) => {
    if (!projectId || typeof projectId !== "string" || projectId.length === 0) {
      console.error(
        "setTimerAndEarningsLight ignored invalid projectId:",
        projectId,
      );
      return;
    }

    store.setTimerAndEarnings(projectId, timer, totalEarnings);
  };

  const startTimer = (
    projectId: string,
    serviceId: string,
    options?: { silent?: boolean },
  ) => {
    if (!isValidProjectId(projectId)) {
      throw new Error(`Invalid projectId format: ${projectId}`);
    }

    if (!serviceId || typeof serviceId !== "string") {
      throw new Error(`Invalid or missing serviceId: ${serviceId}`);
    }

    return store.startTimer(projectId, serviceId, options);
  };

  const stopTimer = (projectId: string, serviceId: string) => {
    if (!isValidProjectId(projectId)) {
      throw new Error(`Invalid projectId format: ${projectId}`);
    }

    if (!serviceId || typeof serviceId !== "string") {
      throw new Error(`Invalid or missing serviceId: ${serviceId}`);
    }

    return store.stopTimer(projectId, serviceId);
  };

  const resetAll = (projectId: string, serviceId: string) => {
    if (!isValidProjectId(projectId)) {
      throw new Error(`Invalid projectId format: ${projectId}`);
    }

    if (!serviceId || typeof serviceId !== "string") {
      throw new Error(`Invalid or missing serviceId: ${serviceId}`);
    }

    return store.resetAll(projectId, serviceId);
  };

  return {
    // Passthrough Actions / State
    ...store,

    // State (explicitly exposed for clarity)
    projects: store.projects,
    currentProjectId: store.currentProjectId,
    rateInput: store.rateInput,
    appState: store.appState,
    isInitialized: store.isInitialized,
    isTracking: store.isTracking,

    // Validated Actions
    setProjectData,
    setTimerAndEarnings,
    setTimerAndEarningsLight,
    startTimer,
    stopTimer,
    resetAll,
  };
};
