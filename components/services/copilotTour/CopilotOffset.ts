///////////////////////CopilotOffset component/////////////////////////////////

// This component is used to calculate the offset for the copilot tour.
// The offset calculation was designed responsively using height + SafeAreaInsets and tested on emulators (Pixel 4a, 6, 6 Pro, Nexus 7, Pixel C).
// The thresholds are based on typical device dimensions and scale reliably on real devices.

//////////////////////////////////////////////////////////////////////////////

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWindowDimensions, PixelRatio, Platform } from "react-native";
import { useEffect, useState } from "react";

//////////////////////////////////////////////////////////////////////////////

export const useCopilotOffset = () => {
  const { top } = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [offset, setOffset] = useState(25); // default offset

  useEffect(() => {
    const scale = PixelRatio.get();
    let calculatedOffset = Math.min(height * 0.045, 60) + top;

    if (height < 700) {
      // e.g. Pixel 4a
      calculatedOffset += 40;
    } else if (height < 850) {
      // e.g. Nexus 7, Pixel 6
      calculatedOffset += 0;
    } else if (height < 1000) {
      // e.g. Pixel 6 Pro
      calculatedOffset -= 5;
    } else {
      // Tablets etc.
      calculatedOffset -= 10;
    }

    // 📋 Debug-Output (only for Dev-Mode with real devices)
    if (__DEV__) {
      console.log("[useCopilotOffset] Debug Info:");
      console.log("Plattform:", Platform.OS);
      console.log("height:", height);
      console.log("width:", width);
      console.log("scale (DPI):", scale);
      console.log("safeArea top:", top);
      console.log("final calculatedOffset:", calculatedOffset);
    }

    setOffset(calculatedOffset);
  }, [height, top]);
  return offset;
};
