"use client";

import { useEffect } from "react";
import { toast } from "./toast-store.mjs";

export function useToastError(message: string) {
  useEffect(() => {
    if (message) toast.error(message);
  }, [message]);
}
