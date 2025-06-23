//////////////////// useDebounceValue hook ////////////////////////////////////

// This hook is used to debounce the value of the ProgressCard component

//////////////////////////////////////////////////////////////////////////////

import { useEffect, useRef } from "react";

//////////////////////////////////////////////////////////////////////////////

const useDebounceValue = <F extends (...args: any[]) => any>(
  func: F,
  wait: number
) => {
  // ref to store the timeout
  const timeout = useRef<NodeJS.Timeout | null>(null);

  // hook to clean up the timeout
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    return new Promise((resolve) => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }

      timeout.current = setTimeout(() => resolve(func(...args)), wait);
    });
  };
};

export default useDebounceValue;
