import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/features/auth/rbac";
import { PERMISSIONS } from "@/features/auth/permissions";
import { listDiagnosticFeedback } from "@/features/diagnostics/service";
import { DiagnosticFeedbackQueueView } from "./_components/diagnostic-feedback-queue-view";

const DEFAULT_MAX_RATING = 3;

export default async function AdminDiagnosticFeedbackPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!hasPermission(session.user.role, PERMISSIONS.ADMIN_DIAGNOSTICS_MANAGE)) redirect("/dashboard");

  const { feedback, total } = await listDiagnosticFeedback({
    maxRating: DEFAULT_MAX_RATING,
    limit: 20,
    offset: 0,
  });

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1100px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Diagnostic Feedback
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Low-rated AI diagnostic sessions flagged for review.
      </p>

      <DiagnosticFeedbackQueueView
        initialFeedback={feedback.map((f) => ({
          id: f.id,
          sessionId: f.sessionId,
          rating: f.rating,
          comment: f.comment,
          createdAt: f.createdAt.toISOString(),
          vehicleLabel: `${f.session.vehicle.year} ${f.session.vehicle.makeName} ${f.session.vehicle.modelName}`,
          symptomLabel: f.session.symptom?.label ?? f.session.category.label,
          isDegraded: f.session.result?.isDegraded ?? false,
          aiProvider: f.session.result?.aiProvider ?? null,
          aiModel: f.session.result?.aiModel ?? null,
          topCauseLabel: f.session.result?.causes[0]?.label ?? null,
        }))}
        initialTotal={total}
        initialMaxRating={DEFAULT_MAX_RATING}
      />
    </div>
  );
}
