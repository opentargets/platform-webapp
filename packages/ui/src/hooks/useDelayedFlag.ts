import { useEffect, useState } from "react";

function useDelayedFlag(flag: boolean, delayMs = 250) {
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    if (!flag) {
      setDelayed(false);
      return;
    }

    const t = window.setTimeout(() => setDelayed(true), delayMs);
    return () => window.clearTimeout(t);
  }, [flag, delayMs]);

  return delayed;
}

export default useDelayedFlag;
