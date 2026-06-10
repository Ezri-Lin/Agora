import { useEffect, useState } from "react";

const NARROW_VIEWPORT = 720;

export function useNarrowViewport(): boolean {
  const [isNarrow, setIsNarrow] = useState(() => getIsNarrow());

  useEffect(() => {
    const handleResize = () => setIsNarrow(getIsNarrow());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isNarrow;
}

function getIsNarrow(): boolean {
  return typeof window !== "undefined" && window.innerWidth < NARROW_VIEWPORT;
}
