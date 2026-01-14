/////////////////// timeTrackingStateSchemas.ts //////////////////////

// This file is used to validate user inputs for time tracking

////////////////////////////////////////////////////////////////////

import { z } from "zod";
import { ProjectState } from "../components/TimeTrackingState";

////////////////////////////////////////////////////////////////////

// is valid projectId
export const isValidProjectId = (projectId: unknown): projectId is string => {
  if (typeof projectId !== "string") return false;
  if (projectId.length === 0 || projectId.length > 100) return false;

  // firestore reserved characters
  const dangerousPatterns = [
    /[.$[\]#\/]/, // Firestore reserved characters
    /^\d+$/, // only numbers (no leading zeros)
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(projectId));
};

/**
 * @AppSec // only for CLI-Purpose, kno real Security-Enforcement
 */
export const ProjectStateSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().max(200).optional(),
  timer: z.number().min(0).max(315360000).default(0), // ~10 Years in seconds
  isTracking: z.boolean().default(false),
  startTime: z.date().nullable().default(null),
  pauseTime: z.date().nullable().default(null),
  hourlyRate: z.number().min(0).max(10000).default(0), // Max 10.000$/h
  elapsedTime: z.number().min(0).max(315360000).default(0),
  totalEarnings: z.number().min(0).max(10000000).default(0), // Max 10Mio
  projectName: z.string().max(200).optional(),
  originalStartTime: z.date().nullable().default(null),
  lastStartTime: z.date().nullable().default(null),
  endTime: z.date().nullable().default(null),
  maxWorkHours: z.number().min(0).max(8760).default(0), // Max 1 Year in seconds
  startTimeTimestamp: z.any().nullable().optional(),
  isRestoring: z.boolean().default(false),
});

// Schema for setTimerAndEarnings Parameters
/**
 * @AppSec // only for CLI-Purpose, kno real Security-Enforcement
 */
export const TimerAndEarningsSchema = z.object({
  projectId: z.string().refine(isValidProjectId, {
    message: "Invalid projectId format",
  }),
  timer: z.number().min(0).max(315360000),
  totalEarnings: z.number().min(0).max(10000000),
  uid: z.string(), // UID from Auth-System
});

// Schema for setProjectData Parameters
/**
 * @AppSec // only for CLI-Purpose, kno real Security-Enforcement
 */
export const SetProjectDataSchema = z.object({
  projectId: z.string().refine(isValidProjectId, {
    message: "Invalid projectId format",
  }),
  projectData: ProjectStateSchema,
  uid: z.string(),
});

// Schema for startTimer Parameters
/**
 * @AppSec // only for CLI-Purpose, kno real Security-Enforcement
 */
export const StartTimerSchema = z.object({
  projectId: z.string().refine(isValidProjectId, {
    message: "Invalid projectId format",
  }),
  options: z
    .object({
      silent: z.boolean().optional(),
    })
    .optional(),
  uid: z.string(),
});

// Validation functions
export const validateProjectState = (data: unknown) => {
  return ProjectStateSchema.parse(data);
};

export const validateTimerAndEarnings = (data: unknown) => {
  return TimerAndEarningsSchema.parse(data);
};

export const validateSetProjectData = (data: unknown) => {
  return SetProjectDataSchema.parse(data);
};

export const validateStartTimer = (data: unknown) => {
  return StartTimerSchema.parse(data);
};

// Type Guards
export const isValidProjectState = (data: unknown): data is ProjectState => {
  return ProjectStateSchema.safeParse(data).success;
};
