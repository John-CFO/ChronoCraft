///////////////////// useProgress.ts //////////////////////////////

// This file is used to initialize a useProgress hook to get the progress of a project

///////////////////////////////////////////////////////////////////

import { useStore } from "./TimeTrackingState";
import { useState, useEffect } from "react";

///////////////////////////////////////////////////////////////////

// function to convert a thing to a date
function toDate(thing: any): Date | null {
  if (!thing) return null;
  if (thing instanceof Date) return thing;
  if (typeof thing.toDate === "function") {
    return thing.toDate();
  }
  const d = new Date(thing);
  return isNaN(d.getTime()) ? null : d;
}

// define the useProgress hook
export function useProgress(projectId: string) {
  const { projects } = useStore();
  const projectState = projects[projectId];

  const [progressState, setProgressState] = useState(() => {
    return computeProgress(projectState);
  });

  // hook to update the progress state
  useEffect(() => {
    const interval = setInterval(() => {
      setProgressState(computeProgress(projectState));
    }, 60000); // every minute

    return () => clearInterval(interval);
  }, [projectState]);

  return progressState;
}

// function to compute the progress
function computeProgress(projectState: any) {
  if (!projectState) return { elapsed: 0, progress: 0 };

  const base = typeof projectState.timer === "number" ? projectState.timer : 0;

  let runningExtra = 0;
  // condition to check if projectState is tracking
  if (projectState.isTracking) {
    const last = toDate(projectState.lastStartTime);
    // condition to check if last is not null and runningExtra is less than 0
    if (last) {
      runningExtra = Math.floor((Date.now() - last.getTime()) / 1000);
      if (runningExtra < 0) runningExtra = 0;
    }
  }

  const elapsed = base + runningExtra;
  // type check
  const maxSecs =
    typeof projectState.maxWorkHours === "number"
      ? projectState.maxWorkHours * 3600
      : null;

  const rawProgress = maxSecs && maxSecs > 0 ? (elapsed / maxSecs) * 100 : 0;
  const progress = Number.isFinite(rawProgress)
    ? Math.min(rawProgress, 100)
    : 0;

  return { elapsed, progress };
}
