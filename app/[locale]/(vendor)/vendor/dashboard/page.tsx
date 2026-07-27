import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyVendorDashboard, listVendorActivity } from "@/features/vendors/service";
import { listInventory } from "@/features/inventory/service";
import { listVendorOrders } from "@/features/vendor-orders/service";
import { AlertTriangle, Building2, Clock, MapPin, ShoppingCart, Users } from "lucide-react";

const AUDIT_LABELS: Record<string, string> = {
  VENDOR_ORG_CREATED: "Business profile created",
  VENDOR_PROFILE_UPDATED: "Business profile updated",
  VENDOR_DOCUMENT_UPLOADED: "Document uploaded",
  VENDOR_DOCUMENT_DELETED: "Document removed",
  VENDOR_SUBMITTED: "Application submitted for review",
  VENDOR_APPROVED: "Application approved",
  VENDOR_REJECTED: "Application rejected",
  VENDOR_LOCATION_CREATED: "Location added",
  VENDOR_LOCATION_UPDATED: "Location updated",
  VENDOR_STAFF_INVITED: "Staff invitation sent",
  VENDOR_STAFF_INVITE_REVOKED: "Staff invitation revoked",
  VENDOR_STAFF_INVITE_ACCEPTED: "Staff invitation accepted",
  VENDOR_STAFF_REMOVED: "Staff member removed",
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

export default async function VendorDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const dashboard = await getMyVendorDashboard(session.user.id);
  if (!dashboard) redirect("/vendor/onboarding" as never);

  const { organization, vendor, locationsCount, staffCount } = dashboard;
  const [activity, inventory, orders] = await Promise.all([
    listVendorActivity(session.user.id),
    listInventory(session.user.id, { limit: 1, offset: 0 }),
    listVendorOrders(session.user.id, { status: "PENDING_CONFIRMATION", limit: 1, offset: 0 }),
  ]);

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1100px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        {organization.name}
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Vendor Dashboard
      </p>

      {vendor.verificationStatus === "SUBMITTED" && (
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

      {vendor.verificationStatus === "REJECTED" && (
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
            Your application was rejected: {vendor.rejectionReason}. Update your details and
            resubmit from{" "}
            <a href="/vendor/onboarding" style={{ fontWeight: 600, textDecoration: "underline" }}>
              Business Profile
            </a>
            .
          </span>
        </div>
      )}

      {vendor.verificationStatus === "DRAFT" && (
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
            <a href="/vendor/onboarding" style={{ fontWeight: 600, textDecoration: "underline" }}>
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
            <Building2 size={16} color="#00b8d9" />
            <span style={{ fontSize: "0.8125rem", color: "#5b6472", fontWeight: 600 }}>
              Inventory SKUs
            </span>
          </div>
          <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
            {inventory.total}
          </p>
        </div>
        <div style={cardStyle}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}
          >
            <ShoppingCart size={16} color="#00b8d9" />
            <span style={{ fontSize: "0.8125rem", color: "#5b6472", fontWeight: 600 }}>
              Orders Awaiting Confirmation
            </span>
          </div>
          <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
            {orders.total}
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
