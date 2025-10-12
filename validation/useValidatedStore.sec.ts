////////////////////////useValidatedStore.sec.ts////////////////////////////////////

// This file contains the validated actions for the global timetracking state

////////////////////////////////////////////////////////////////////////////////

import { ProjectState, useStore } from "../components/TimeTrackingState";
import {
  validateSetProjectData,
  validateTimerAndEarnings,
  isValidProjectId,
} from "./timeTrackingStateSchemas.sec";

////////////////////////////////////////////////////////////////////////////////

export const useValidatedStore = () => {
  const store = useStore as any;

  // Heavy validation: Zod parsing + throws on invalid input
  const setProjectData = (
    projectId: string,
    projectData: Partial<ProjectState>
  ) => {
    if (!isValidProjectId(projectId)) {
      throw new Error(`Invalid projectId format: ${projectId}`);
    }

    const validatedData = validateSetProjectData({ projectId, projectData });
    store.setProjectData(validatedData.projectId, validatedData.projectData);
  };

  // Heavy validation: Zod parsing
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

  // Light validation: Hot-path for AppStateChange / AsyncStorage
  const setTimerAndEarningsLight = (
    projectId: string,
    timer: number,
    totalEarnings: number
  ) => {
    // only minimal validation for performance
    if (!projectId || typeof projectId !== "string" || projectId.length === 0) {
      console.error(
        "setTimerAndEarningsLight ignored invalid projectId:",
        projectId
      );
      return;
    }
    store.setTimerAndEarnings(projectId, timer, totalEarnings);
  };

  // Timer control
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

    // Passthrough Actions (not appsec critical)
    resetAll: store.resetAll,
    setAppState: store.setAppState,
    setHourlyRate: store.setHourlyRate,
    updateTimer: store.updateTimer,
    setTotalEarnings: store.setTotalEarnings,
    getProjectState: store.getProjectState,
    pauseTimer: store.pauseTimer,
    calculateEarnings: store.calculateEarnings,
    setProjectId: store.setProjectId,
    setRateInput: store.setRateInput,
    setIsInitialized: store.setIsInitialized,
    setIsTracking: store.setIsTracking,
    getProjectTrackingState: store.getProjectTrackingState,
    getProjectId: store.getProjectId,
    setProjectTime: store.setProjectTime,
    setLastStartTime: store.setLastStartTime,
    setOriginalStartTime: store.setOriginalStartTime,

    // Store Methods
    subscribe: store.subscribe,
    getState: store.getState,
  };
};
