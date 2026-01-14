//////////////////////// useValidatedStore.ts ////////////////////////////////////

// This file contains the validated actions for the global timetracking state

////////////////////////////////////////////////////////////////////////////////

import { UseBoundStore, StoreApi } from "zustand";

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
  // Typecast, so TS knows, that  mock is compatible
  useStore = (() => mock) as unknown as UseBoundStore<
    StoreApi<TimeTrackingState>
  >;
};

// Hook
export const useValidatedStore = () => {
  const store = useStore() as any;

  const setProjectData = (
    projectId: string,
    projectData: Partial<ProjectState>
  ) => {
    if (!isValidProjectId(projectId))
      throw new Error(`Invalid projectId format: ${projectId}`);
    const validatedData = validateSetProjectData({ projectId, projectData });
    store.setProjectData(validatedData.projectId, validatedData.projectData);
  };

  const setTimerAndEarnings = (
    projectId: string,
    timer: number,
    totalEarnings: number
  ) => {
    const validatedData = validateTimerAndEarnings({
      projectId,
      timer,
      totalEarnings,
    });
    store.setTimerAndEarnings(
      validatedData.projectId,
      validatedData.timer,
      validatedData.totalEarnings
    );
  };

  const setTimerAndEarningsLight = (
    projectId: string,
    timer: number,
    totalEarnings: number
  ) => {
    if (!projectId || typeof projectId !== "string" || projectId.length === 0) {
      console.error(
        "setTimerAndEarningsLight ignored invalid projectId:",
        projectId
      );
      return;
    }
    store.setTimerAndEarnings(projectId, timer, totalEarnings);
  };

  const startTimer = (projectId: string) => {
    if (!isValidProjectId(projectId))
      throw new Error(`Invalid projectId format: ${projectId}`);
    store.startTimer(projectId);
  };

  const stopTimer = (projectId: string) => {
    if (!isValidProjectId(projectId))
      throw new Error(`Invalid projectId format: ${projectId}`);
    store.stopTimer(projectId);
  };

  return {
    // State
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

    // Passthrough Actions
    ...store,
  };
};
