// timeTrackingStateSchemas.ts
import { z } from "zod";
import { ProjectState } from "../components/TimeTrackingState";

// 🔧 REALISTISCHE Validation für Expo+Firestore
export const isValidProjectId = (projectId: unknown): projectId is string => {
  if (typeof projectId !== "string") return false;
  if (projectId.length === 0 || projectId.length > 100) return false;

  // ✅ Firestore Document ID Einschränkungen
  const dangerousPatterns = [
    /[.$[\]#\/]/, // Firestore reserved characters
    /^\d+$/, // Nur Zahlen (könnte zu Verwechslungen führen)
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(projectId));
};

// Realistische Zod Schema für ProjectState mit sinnvollen Grenzen
export const ProjectStateSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().max(200).optional(),
  timer: z.number().min(0).max(315360000).default(0), // ~10 Jahre in Sekunden
  isTracking: z.boolean().default(false),
  startTime: z.date().nullable().default(null),
  pauseTime: z.date().nullable().default(null),
  hourlyRate: z.number().min(0).max(10000).default(0), // Max 10.000€/h
  elapsedTime: z.number().min(0).max(315360000).default(0),
  totalEarnings: z.number().min(0).max(10000000).default(0), // Max 10Mio
  projectName: z.string().max(200).optional(),
  originalStartTime: z.date().nullable().default(null),
  lastStartTime: z.date().nullable().default(null),
  endTime: z.date().nullable().default(null),
  maxWorkHours: z.number().min(0).max(8760).default(0), // Max 1 Jahr Stunden
  startTimeTimestamp: z.any().nullable().optional(),
  isRestoring: z.boolean().default(false),
});

// Schema für setTimerAndEarnings Parameters
export const TimerAndEarningsSchema = z.object({
  projectId: z.string().refine(isValidProjectId, {
    message: "Invalid projectId format",
  }),
  timer: z.number().min(0).max(315360000),
  totalEarnings: z.number().min(0).max(10000000),
});

// Schema für setProjectData Parameters
export const SetProjectDataSchema = z.object({
  projectId: z.string().refine(isValidProjectId, {
    message: "Invalid projectId format",
  }),
  projectData: ProjectStateSchema.partial(),
});

// Schema für startTimer Parameters
export const StartTimerSchema = z.object({
  projectId: z.string().refine(isValidProjectId, {
    message: "Invalid projectId format",
  }),
  options: z
    .object({
      silent: z.boolean().optional(),
    })
    .optional(),
});

// Validierungsfunktionen
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
