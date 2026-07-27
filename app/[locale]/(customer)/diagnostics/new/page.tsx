import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DiagnosticWizard } from "./_components/diagnostic-wizard";

interface Props {
  searchParams: Promise<{ session?: string }>;
}

export default async function NewDiagnosisPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const { session: sessionId } = await searchParams;

  // Load user vehicles
  const vehicles = await db.customerVehicle.findMany({
    where: { userId: session.user.id, deletedAt: null },
    select: {
      id: true,
      makeName: true,
      modelName: true,
      trimName: true,
      year: true,
      plateNumber: true,
      isDefault: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  // Load symptom categories with their symptoms
  const categories = await db.symptomCategory.findMany({
    where: { isActive: true },
    include: {
      symptoms: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Resume existing session if provided
  let resumeSession = null;
  if (sessionId) {
    resumeSession = await db.diagnosticSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
      include: {
        answers: true,
        symptom: { select: { id: true, code: true, label: true, isSafetyCritical: true } },
        category: { select: { id: true, code: true, label: true } },
      },
    });
  }

  if (vehicles.length === 0) {
    redirect("/vehicles/new" as never);
  }

  return (
    <DiagnosticWizard
      vehicles={vehicles}
      categories={categories as never}
      resumeSession={resumeSession as never}
    />
  );
}
