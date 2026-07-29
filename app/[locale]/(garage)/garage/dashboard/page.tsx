import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyGarageDashboard, listGarageActivity } from "@/features/garages/service";
import { AlertTriangle, Building2, Clock, MapPin, Users, Wrench } from "lucide-react";

const AUDIT_LABELS: Record<string, string> = {
  GARAGE_ORG_CREATED: "Business profile created",
  GARAGE_PROFILE_UPDATED: "Business profile updated",
  GARAGE_DOCUMENT_UPLOADED: "Document uploaded",
  GARAGE_DOCUMENT_DELETED: "Document removed",
  GARAGE_SUBMITTED: "Application submitted for review",
  GARAGE_APPROVED: "Application approved",
  GARAGE_REJECTED: "Application rejected",
  GARAGE_LOCATION_CREATED: "Location added",
  GARAGE_LOCATION_UPDATED: "Location updated",
  GARAGE_WORKING_HOURS_UPDATED: "Working hours updated",
  GARAGE_SERVICES_UPDATED: "Services updated",
  GARAGE_VEHICLE_CAPABILITIES_UPDATED: "Vehicle capabilities updated",
  GARAGE_MAKE_SPECIALIZATIONS_UPDATED: "Make specializations updated",
  GARAGE_STAFF_INVITED: "Staff invitation sent",
  GARAGE_STAFF_INVITE_REVOKED: "Staff invitation revoked",
  GARAGE_STAFF_INVITE_ACCEPTED: "Staff invitation accepted",
  GARAGE_STAFF_REMOVED: "Staff member removed",
  GARAGE_MECHANIC_PROFILE_UPDATED: "Mechanic profile updated",
};

function timeAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  padding: "1.25rem",
  backgroundColor: "var(--card)",
};

export default async function GarageDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const dashboard = await getMyGarageDashboard(session.user.id);
  if (!dashboard) redirect("/garage/onboarding" as never);

  const {
    organization,
    garage,
    locationsCount,
    staffCount,
    servicesCount,
    vehicleCapabilitiesCount,
  } = dashboard;
  const activity = await listGarageActivity(session.user.id);

  return (
    <div className="px-4 py-6 sm:px-10 sm:py-8" style={{ maxWidth: "1100px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        {organization.name}
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Garage Dashboard
      </p>

      {garage.verificationStatus === "SUBMITTED" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.875rem 1rem",
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "0.5rem",
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
            color: "#92400e",
          }}
        >
          <Clock size={18} />
          <span>
            Your application is awaiting admin review. This typically takes 1-2 business days.
          </span>
        </div>
      )}

      {garage.verificationStatus === "REJECTED" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.875rem 1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.5rem",
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
            color: "#991b1b",
          }}
        >
          <AlertTriangle size={18} />
          <span>
            Your application was rejected: {garage.rejectionReason}. Update your details and
            resubmit from{" "}
            <a href="/garage/onboarding" style={{ fontWeight: 600, textDecoration: "underline" }}>
              Business Profile
            </a>
            .
          </span>
        </div>
      )}

      {garage.verificationStatus === "DRAFT" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.875rem 1rem",
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "0.5rem",
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
            color: "#1e40af",
          }}
        >
          <Building2 size={18} />
          <span>
            Finish onboarding to get verified —{" "}
            <a href="/garage/onboarding" style={{ fontWeight: 600, textDecoration: "underline" }}>
              continue your application
            </a>
            .
          </span>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={cardStyle}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}
          >
            <MapPin size={16} color="#00b8d9" />
            <span style={{ fontSize: "0.8125rem", color: "#5b6472", fontWeight: 600 }}>
              Active Locations
            </span>
          </div>
          <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
            {locationsCount}
          </p>
        </div>
        <div style={cardStyle}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}
          >
            <Users size={16} color="#00b8d9" />
            <span style={{ fontSize: "0.8125rem", color: "#5b6472", fontWeight: 600 }}>
              Staff Members
            </span>
          </div>
          <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
            {staffCount}
          </p>
        </div>
        <div style={cardStyle}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}
          >
            <Wrench size={16} color="#00b8d9" />
            <span style={{ fontSize: "0.8125rem", color: "#5b6472", fontWeight: 600 }}>
              Services Offered
            </span>
          </div>
          <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
            {servicesCount}
          </p>
        </div>
        <div style={cardStyle}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}
          >
            <Building2 size={16} color="#00b8d9" />
            <span style={{ fontSize: "0.8125rem", color: "#5b6472", fontWeight: 600 }}>
              Vehicle Types Supported
            </span>
          </div>
          <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
            {vehicleCapabilitiesCount}
          </p>
        </div>
      </div>

      <div style={cardStyle}>
        <h2
          style={{
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: "#081a2f",
            marginBottom: "0.875rem",
          }}
        >
          Recent Activity
        </h2>
        {activity.length === 0 ? (
          <p style={{ fontSize: "0.8125rem", color: "#8a92a6" }}>No activity yet.</p>
        ) : (
          activity.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.625rem 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.8125rem",
              }}
            >
              <span style={{ color: "#081a2f" }}>{AUDIT_LABELS[entry.action] ?? entry.action}</span>
              <span style={{ color: "#8a92a6" }}>{timeAgo(entry.createdAt)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
