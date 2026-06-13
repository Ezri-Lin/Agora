import { useEffect, useRef } from "react";

export function useToolComplete(
  isAnimating: boolean,
  duration: number,
  onComplete: () => void,
) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isAnimating) return;
    const timer = setTimeout(() => {
      onCompleteRef.current();
    }, duration);
    return () => clearTimeout(timer);
  }, [isAnimating, duration]);
}
