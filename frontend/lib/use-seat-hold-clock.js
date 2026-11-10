"use client";

import { useEffect, useState } from "react";

export function useSeatHoldClock(serverNow) {
  const [clock, setClock] = useState(null);
  useEffect(() => {
    const base = Date.parse(serverNow);
    if (!Number.isFinite(base)) return;
    const start = performance.now();
    const timer = setInterval(() => setClock({ source: serverNow, time: base + performance.now() - start }), 250);
    return () => clearInterval(timer);
  }, [serverNow]);
  return clock && clock.source === serverNow ? clock.time : Date.parse(serverNow);
}
