"use client";

import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";

export interface GarageMapPin {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface Props {
  pins: GarageMapPin[];
  userLocation?: { latitude: number; longitude: number } | null;
  height?: string;
  selectedId?: string | null;
  onPinClick?: (id: string) => void;
}

const FALLBACK_STYLE: React.CSSProperties = {
  height: "100%",
  minHeight: "220px",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
  backgroundColor: "#f1f4f7",
  border: "1px dashed var(--border)",
  borderRadius: "0.75rem",
  color: "#74777d",
  fontSize: "0.8125rem",
  textAlign: "center",
  padding: "1.5rem",
};

function MapFallback({ message }: { message: string }) {
  return (
    <div style={FALLBACK_STYLE}>
      <MapPin size={22} color="#a1a5ab" />
      {message}
    </div>
  );
}

/**
 * Interactive Google Map with garage pins — feature-detects
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY at render time and renders a plain
 * fallback message when absent (never throws, never shows a blank/broken
 * map), the same graceful-degradation treatment Sprint 18 established for
 * the SpeechRecognition mic control. No API key is provisioned yet — see
 * CLAUDE.md's Sprint 21 notes, this needs a manual pass once one is.
 */
export function GarageMap({ pins, userLocation, height = "320px", selectedId, onPinClick }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div style={{ height }}>
        <MapFallback message="Map view is not available." />
      </div>
    );
  }

  if (pins.length === 0) {
    return (
      <div style={{ height }}>
        <MapFallback message="No mapped locations for these results yet." />
      </div>
    );
  }

  const center = userLocation ?? {
    latitude: pins.reduce((sum, p) => sum + p.latitude, 0) / pins.length,
    longitude: pins.reduce((sum, p) => sum + p.longitude, 0) / pins.length,
  };
  const zoom = pins.length === 1 && !userLocation ? 13 : 8;

  return (
    <div style={{ height, borderRadius: "0.75rem", overflow: "hidden" }}>
      <APIProvider apiKey={apiKey}>
        <Map
          mapId="autoiq-garage-map"
          defaultCenter={{ lat: center.latitude, lng: center.longitude }}
          defaultZoom={zoom}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          style={{ width: "100%", height: "100%" }}
        >
          {userLocation && (
            <AdvancedMarker position={{ lat: userLocation.latitude, lng: userLocation.longitude }}>
              <Pin background="#081a2f" borderColor="#081a2f" glyphColor="#fff" />
            </AdvancedMarker>
          )}
          {pins.map((pin) => (
            <AdvancedMarker
              key={pin.id}
              position={{ lat: pin.latitude, lng: pin.longitude }}
              title={pin.name}
              onClick={() => onPinClick?.(pin.id)}
            >
              <Pin
                background={selectedId === pin.id ? "#00b8d9" : "#0891b2"}
                borderColor="#081a2f"
                glyphColor="#fff"
              />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
