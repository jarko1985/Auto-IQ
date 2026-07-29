"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Building2, XCircle } from "lucide-react";

interface InvitationDetails {
  organizationName: string;
  organizationType: "VENDOR" | "GARAGE";
  role: string;
  status: string;
  email: string;
  expiresAt: string;
}

interface Props {
  token: string;
  invitation: InvitationDetails | null;
  isSignedIn: boolean;
  sessionEmail: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  VENDOR_OWNER: "Owner",
  VENDOR_STAFF: "Staff",
  GARAGE_OWNER: "Owner",
  GARAGE_MANAGER: "Manager",
  MECHANIC: "Mechanic",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "440px",
  border: "1px solid var(--border)",
  borderRadius: "1rem",
  backgroundColor: "var(--card)",
  textAlign: "center",
};

function InvalidState({ message }: { message: string }) {
  return (
    <div className="p-3 sm:p-8" style={cardStyle}>
      <XCircle size={40} color="#dc2626" style={{ margin: "0 auto 1rem" }} />
      <h1
        style={{ fontSize: "1.125rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.5rem" }}
      >
        Invitation Unavailable
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472" }}>{message}</p>
    </div>
  );
}

export function InvitationAcceptCard({ token, invitation, isSignedIn, sessionEmail }: Props) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);

  if (!invitation) {
    return <InvalidState message="This invitation link is invalid or has already been used." />;
  }
  if (invitation.status !== "PENDING") {
    return <InvalidState message="This invitation is no longer active." />;
  }
  if (new Date(invitation.expiresAt) < new Date()) {
    return (
      <InvalidState message="This invitation has expired. Ask the organization owner to send a new one." />
    );
  }

  const emailMatches = isSignedIn && sessionEmail?.toLowerCase() === invitation.email.toLowerCase();

  const isGarage = invitation.organizationType === "GARAGE";

  async function handleAccept() {
    setAccepting(true);
    try {
      const acceptUrl = isGarage
        ? `/api/v1/garages/invitations/${token}/accept`
        : `/api/v1/vendors/invitations/${token}/accept`;
      const res = await fetch(acceptUrl, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to accept invitation.");
        return;
      }
      toast.success("Invitation accepted.");
      const dashboardPath = isGarage ? "/garage/dashboard" : "/vendor/dashboard";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(dashboardPath as any);
      router.refresh();
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="p-3 sm:p-8" style={cardStyle}>
      <Building2 size={40} color="#00b8d9" style={{ margin: "0 auto 1rem" }} />
      <h1
        style={{ fontSize: "1.125rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.5rem" }}
      >
        Join {invitation.organizationName}
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        You&apos;ve been invited as{" "}
        <strong>{ROLE_LABELS[invitation.role] ?? invitation.role}</strong>. This invitation was sent
        to <strong>{invitation.email}</strong>.
      </p>

      {!isSignedIn && (
        <>
          <p style={{ fontSize: "0.8125rem", color: "#8a92a6", marginBottom: "1rem" }}>
            Sign in or create an account with this email address, then return to this link to
            accept.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link
              href="/sign-in"
              style={{
                flex: 1,
                padding: "0.625rem",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#081a2f",
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              style={{
                flex: 1,
                padding: "0.625rem",
                backgroundColor: "#081a2f",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#fff",
                textDecoration: "none",
              }}
            >
              Create Account
            </Link>
          </div>
        </>
      )}

      {isSignedIn && !emailMatches && (
        <p style={{ fontSize: "0.8125rem", color: "#991b1b" }}>
          You&apos;re signed in as {sessionEmail}, but this invitation was sent to{" "}
          {invitation.email}. Sign in with the invited email address to accept.
        </p>
      )}

      {emailMatches && (
        <button
          type="button"
          onClick={handleAccept}
          disabled={accepting}
          style={{
            width: "100%",
            padding: "0.75rem 1.25rem",
            backgroundColor: accepting ? "#94a3b8" : "#00b8d9",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: accepting ? "not-allowed" : "pointer",
          }}
        >
          {accepting ? "Joining..." : "Accept Invitation"}
        </button>
      )}
    </div>
  );
}
