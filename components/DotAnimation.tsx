/////////////////////////DotAnimation Component//////////////////////////////

// This component is used to centrelize the dot animation which is used in several components

/////////////////////////////////////////////////////////////////////////////

import { useEffect, useState } from "react";

////////////////////////////////////////////////////////////////////////////

export function useDotAnimation(aktiv: boolean, intervalMs = 500) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!aktiv) {
      setDots("");
      return;
    }

    const id = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, intervalMs);

    return () => clearInterval(id);
  }, [aktiv, intervalMs]);

  return dots;
}
