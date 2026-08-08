import { Car } from "lucide-react";
import { getMakeLogo } from "@/features/vehicles/make-logo";

export function MakeLogoBadge({
  makeName,
  size = 40,
  indicator,
}: {
  makeName: string;
  size?: number;
  /** Small corner dot for at-a-glance status (e.g. safety escalation) without needing the emoji this replaces. */
  indicator?: "danger";
}) {
  const logo = getMakeLogo(makeName);
  const iconSize = Math.round(size * 0.42);
  const logoPadding = Math.round(size * 0.2);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "9999px",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: logo ? "#fff" : "linear-gradient(135deg, #0f2744 0%, #1a3a5c 100%)",
          border: logo ? "1px solid #e5e7eb" : "1px solid rgba(255,255,255,0.08)",
          boxShadow: logo ? "0 1px 3px rgba(0,0,0,0.08)" : undefined,
        }}
      >
        {logo ? (
          // Plain <img>, not next/image: local SVGs are blocked by Next's image
          // optimizer unless images.dangerouslyAllowSVG is set, and a vector logo
          // gains nothing from raster optimization anyway.
          <img
            src={logo}
            alt={`${makeName} logo`}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: logoPadding,
            }}
          />
        ) : (
          <Car size={iconSize} color="rgba(255,255,255,0.65)" />
        )}
      </div>
      {indicator === "danger" && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -2,
            insetInlineEnd: -2,
            width: Math.max(10, Math.round(size * 0.26)),
            height: Math.max(10, Math.round(size * 0.26)),
            borderRadius: "9999px",
            backgroundColor: "#dc2626",
            border: "2px solid #fff",
          }}
        />
      )}
    </div>
  );
}
