export interface OrgStatusBadge {
  name: string;
  label: string;
  color: string;
  backgroundColor: string;
}

/** Shared status→color/label mapping for the vendor/garage sidebar and
 * mobile drawer org badge — was previously duplicated inline in both
 * VendorSidebar and GarageSidebar. */
export function resolveOrgStatusBadge(
  organizationName: string,
  organizationStatus: string,
  activeLabel: string,
): OrgStatusBadge {
  return {
    name: organizationName,
    label:
      organizationStatus === "ACTIVE"
        ? activeLabel
        : organizationStatus === "REJECTED"
          ? "Rejected"
          : "Pending Approval",
    color:
      organizationStatus === "ACTIVE"
        ? "#4ade80"
        : organizationStatus === "REJECTED"
          ? "#f87171"
          : "#fbbf24",
    backgroundColor:
      organizationStatus === "ACTIVE"
        ? "rgba(22,163,74,0.2)"
        : organizationStatus === "REJECTED"
          ? "rgba(220,38,38,0.2)"
          : "rgba(217,119,6,0.2)",
  };
}
