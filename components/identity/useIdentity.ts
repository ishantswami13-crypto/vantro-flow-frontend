"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/api";
import { applyIdentity, chosenIdentity, IDENTITY_EVENT, type Identity } from "@/lib/identity";

// Current user's identity; re-renders when they pick a new one.
export function useIdentity(): Identity {
  const [identity, setIdentity] = useState<Identity>(() => chosenIdentity(null));
  useEffect(() => {
    const read = () => {
      const u = getUser();
      setIdentity(chosenIdentity(u?.id || u?.email || null));
    };
    read();
    window.addEventListener(IDENTITY_EVENT, read);
    return () => window.removeEventListener(IDENTITY_EVENT, read);
  }, []);
  return identity;
}

// Mount once (DashboardLayout) to keep the :root CSS variables in sync.
export function useApplyIdentity() {
  const identity = useIdentity();
  useEffect(() => { applyIdentity(identity); }, [identity]);
  return identity;
}
