"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, Loader2, MapPin } from "lucide-react";
import { GarageMap, type GarageMapPin } from "@/components/maps/garage-map";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { ObdScanBookingView } from "@/components/garages/obd-scan-booking-view";
import { ObdScanConfirmationView } from "@/components/garages/obd-scan-confirmation-view";

interface ObdScanGarage {
  id: string;
  businessName: string;
  description: string | null;
  photoUrl: string | null;
  locationId: string | null;
  addressLine1: string | null;
  emirate: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** The wizard's already-selected vehicle — a booking always needs one, and
   * by Step 3 (where this modal opens from) the wizard already has it, so the
   * customer is never asked to pick a vehicle a second time. */
  vehicleId: string;
  /** Links the resulting booking back to the diagnostic session this modal
   * was launched from, same linkage the "Find a Garage for This Repair" CTA
   * (Sprint 21) already uses. */
  diagnosticSessionId: string | null;
}

type View = "list" | "booking" | "confirmation";

const RESULT_LIMIT = 4;

function formatDistance(distanceKm: number | null): string | null {
  if (distanceKm == null) return null;
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m away`;
  return `${distanceKm.toFixed(1)} km away`;
}

export function ObdScanModal({ open, onClose, vehicleId, diagnosticSessionId }: Props) {
  const geo = useGeolocation();
  const [garages, setGarages] = useState<ObdScanGarage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [view, setView] = useState<View>("list");
  const [contentVisible, setContentVisible] = useState(true);
  const [bookingGarage, setBookingGarage] = useState<ObdScanGarage | null>(null);
  const [bookingResult, setBookingResult] = useState<{ id: string; scheduledStart: string } | null>(
    null,
  );

  // Fade/scale the modal in on the next paint after mount, and kick off the
  // geolocation prompt once per open — opening this modal is itself the
  // deliberate user gesture, so no separate "Use my location" click is
  // required here (unlike the full garage search page's own convention).
  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const raf = requestAnimationFrame(() => setVisible(true));
    geo.request();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset to the garage list every time the modal is reopened, so a closed
  // mid-booking session never reappears stale.
  useEffect(() => {
    if (open) {
      setView("list");
      setBookingGarage(null);
      setBookingResult(null);
      setContentVisible(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open || geo.status === "requesting") return;

    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          serviceTypes: "OBD_SCAN",
          limit: String(RESULT_LIMIT),
        });
        if (geo.status === "granted" && geo.coords) {
          params.set("lat", String(geo.coords.latitude));
          params.set("lng", String(geo.coords.longitude));
          params.set("sort", "distance");
        } else {
          params.set("sort", "rating");
        }
        const res = await fetch(`/api/v1/garages/search?${params.toString()}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json?.error?.message ?? "Search failed");
        const results: ObdScanGarage[] = json.data;
        setGarages(results);
        setSelectedId(results[0]?.id ?? null);
      } catch {
        if (!cancelled) setError("Couldn't load nearby OBD scan garages. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, geo.status]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const pins: GarageMapPin[] = garages
    .filter((g): g is ObdScanGarage & { latitude: number; longitude: number } =>
      g.latitude != null && g.longitude != null,
    )
    .map((g) => ({ id: g.id, name: g.businessName, latitude: g.latitude, longitude: g.longitude }));

  function selectGarage(id: string) {
    setSelectedId(id);
    cardRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }

  // Crossfades between the three screens within the same modal shell —
  // fade the current content out, swap it, fade back in.
  function switchView(next: View) {
    setContentVisible(false);
    setTimeout(() => {
      setView(next);
      setContentVisible(true);
    }, 180);
  }

  function openBooking(garage: ObdScanGarage) {
    if (!garage.locationId) {
      setError("This garage doesn't have a bookable location yet.");
      return;
    }
    setBookingGarage(garage);
    switchView("booking");
  }

  function handleBooked(bookingId: string, scheduledStart: string) {
    setBookingResult({ id: bookingId, scheduledStart });
    switchView("confirmation");
  }

  const showLocationFallbackNote = geo.status === "denied" || geo.status === "unsupported";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="obd-scan-modal-title"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backgroundColor: "rgba(8,26,47,0.6)",
        backdropFilter: "blur(3px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "800px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: "#fff",
          borderRadius: "1.25rem",
          boxShadow: "0 25px 60px -15px rgba(8,26,47,0.4)",
          transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.98)",
          transition: "transform 0.25s ease, opacity 0.25s ease",
          opacity: visible ? 1 : 0,
        }}
      >
        {view === "list" && (
          <>
            {/* Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid #ebeef1",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "1rem",
                flexShrink: 0,
              }}
            >
              <div>
                <h3
                  id="obd-scan-modal-title"
                  style={{ margin: 0, fontSize: "1.1875rem", fontWeight: 700, color: "#081a2f" }}
                >
                  Book a Free OBD Scan
                </h3>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#5b6472" }}>
                  Choose the nearest service to your current location
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  padding: "0.5rem",
                  borderRadius: "9999px",
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  color: "#5b6472",
                  flexShrink: 0,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                overflowY: "auto",
                opacity: contentVisible ? 1 : 0,
                transition: "opacity 0.18s ease",
              }}
            >
              {/* Map */}
              <div style={{ padding: "1.25rem 1.5rem 0" }}>
                <GarageMap
                  pins={pins}
                  userLocation={geo.status === "granted" ? geo.coords : null}
                  height="280px"
                  selectedId={selectedId}
                  onPinClick={selectGarage}
                />
                {showLocationFallbackNote && (
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "#a1a5ab" }}>
                    {geo.status === "denied"
                      ? "Location access denied — showing top-rated OBD scan garages instead."
                      : "Your browser doesn't support location — showing top-rated OBD scan garages instead."}
                  </p>
                )}
              </div>

              {/* List */}
              <div style={{ padding: "1.25rem 1.5rem 1.5rem" }}>
                {loading || geo.status === "requesting" ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      padding: "2.5rem 0",
                      color: "#5b6472",
                      fontSize: "0.875rem",
                    }}
                  >
                    <Loader2 size={16} className="animate-spin" />
                    Finding nearby OBD scan garages...
                  </div>
                ) : error ? (
                  <p
                    style={{
                      textAlign: "center",
                      padding: "2.5rem 0",
                      color: "#dc2626",
                      fontSize: "0.875rem",
                    }}
                  >
                    {error}
                  </p>
                ) : garages.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2.5rem 0" }}>
                    <MapPin size={22} color="#a1a5ab" style={{ marginBottom: "0.5rem" }} />
                    <p style={{ margin: 0, color: "#5b6472", fontSize: "0.875rem" }}>
                      No garages currently offer OBD scanning nearby.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
                    {garages.map((g) => {
                      const selected = g.id === selectedId;
                      const distanceLabel = formatDistance(g.distanceKm);
                      const locationLabel = [g.addressLine1, g.emirate].filter(Boolean).join(" • ");
                      return (
                        <div
                          key={g.id}
                          ref={(el) => {
                            cardRefs.current[g.id] = el;
                          }}
                          onClick={() => selectGarage(g.id)}
                          style={{
                            width: "230px",
                            flexShrink: 0,
                            display: "flex",
                            flexDirection: "column",
                            padding: "0.625rem",
                            borderRadius: "0.875rem",
                            border: selected ? "2px solid #00b8d9" : "1px solid #ebeef1",
                            boxShadow: selected ? "0 8px 20px -10px rgba(0,184,217,0.4)" : "none",
                            backgroundColor: "#fff",
                            cursor: "pointer",
                            transition: "border-color 0.2s, box-shadow 0.2s",
                          }}
                        >
                          <div
                            style={{
                              position: "relative",
                              width: "100%",
                              height: "112px",
                              borderRadius: "0.625rem",
                              overflow: "hidden",
                              marginBottom: "0.625rem",
                              backgroundColor: "#e5e9ef",
                            }}
                          >
                            {g.photoUrl && (
                              <Image
                                src={g.photoUrl}
                                alt={g.businessName}
                                fill
                                sizes="230px"
                                style={{ objectFit: "cover" }}
                              />
                            )}
                          </div>
                          <h4
                            style={{
                              margin: "0 0 0.1875rem",
                              fontSize: "0.875rem",
                              fontWeight: 700,
                              color: "#081a2f",
                            }}
                          >
                            {g.businessName}
                          </h4>
                          {g.description && (
                            <p
                              style={{
                                margin: "0 0 0.375rem",
                                fontSize: "0.75rem",
                                color: "#5b6472",
                                lineHeight: 1.4,
                              }}
                            >
                              {g.description}
                            </p>
                          )}
                          <p style={{ margin: "0 0 0.75rem", fontSize: "0.6875rem", color: "#8a92a6" }}>
                            {locationLabel}
                            {distanceLabel ? ` • ${distanceLabel}` : ""}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openBooking(g);
                            }}
                            style={{
                              marginTop: "auto",
                              padding: "0.5rem",
                              borderRadius: "0.625rem",
                              border: "none",
                              backgroundColor: selected ? "#00b8d9" : "#081a2f",
                              color: "#fff",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Book Now
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {view === "booking" && bookingGarage && bookingGarage.locationId && (
          <div
            style={{
              padding: "1.5rem",
              overflowY: "auto",
              opacity: contentVisible ? 1 : 0,
              transition: "opacity 0.18s ease",
            }}
          >
            <ObdScanBookingView
              garageId={bookingGarage.id}
              garageName={bookingGarage.businessName}
              locationId={bookingGarage.locationId}
              vehicleId={vehicleId}
              diagnosticSessionId={diagnosticSessionId}
              onBack={() => switchView("list")}
              onBooked={handleBooked}
            />
          </div>
        )}

        {view === "confirmation" && bookingGarage && bookingResult && (
          <div
            style={{
              padding: "1.5rem",
              overflowY: "auto",
              opacity: contentVisible ? 1 : 0,
              transition: "opacity 0.18s ease",
            }}
          >
            <ObdScanConfirmationView
              garageName={bookingGarage.businessName}
              scheduledStart={bookingResult.scheduledStart}
              onClose={onClose}
            />
          </div>
        )}
      </div>
    </div>
  );
}
