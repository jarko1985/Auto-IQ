"use client";

import { useCallback, useState } from "react";

export type GeolocationStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported";

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
}

export interface UseGeolocationResult {
  status: GeolocationStatus;
  coords: GeolocationCoords | null;
  error: string | null;
  /** Triggers the browser permission prompt. Never blocks or throws — denial
   * and absence both just leave the rest of the UI to carry on without a
   * location, same graceful-degradation posture as every other
   * browser-capability integration in this codebase (e.g. Sprint 18's
   * SpeechRecognition mic control). */
  request: () => void;
}

/** Mirrors the diagnostic wizard's voice-input state shape (idle/requesting/
 * granted/denied/unsupported) rather than a boolean loading flag, so the UI
 * can render a distinct message for "never asked" vs "denied" vs "this
 * browser can't do this at all". */
export function useGeolocation(): UseGeolocationResult {
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }

    setStatus("requesting");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setStatus("granted");
      },
      (err) => {
        setError(err.message);
        setStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  return { status, coords, error, request };
}
