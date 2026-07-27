import { auth } from "@/auth";
import { getInvitationByToken } from "@/features/vendors/service";
import { NotFoundError } from "@/lib/errors";
import { InvitationAcceptCard } from "./_components/invitation-accept-card";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitationPage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  let invitation: Awaited<ReturnType<typeof getInvitationByToken>> | null = null;
  try {
    invitation = await getInvitationByToken(token);
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--background)",
        padding: "1.5rem",
      }}
    >
      <InvitationAcceptCard
        token={token}
        invitation={
          invitation
            ? {
                organizationName: invitation.organization.name,
                organizationType: invitation.organization.type,
                role: invitation.role,
                status: invitation.status,
                email: invitation.email,
                expiresAt: invitation.expiresAt.toISOString(),
              }
            : null
        }
        isSignedIn={Boolean(session?.user)}
        sessionEmail={session?.user?.email ?? null}
      />
    </div>
  );
}
