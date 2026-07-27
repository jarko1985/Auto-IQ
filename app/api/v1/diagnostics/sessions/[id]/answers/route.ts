import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { submitAnswersSchema } from "@/features/diagnostics/schemas";
import { submitAnswers } from "@/features/diagnostics/service";
import { toApiError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 },
      );
    }
    const { id } = await params;
    const body = (await req.json()) as unknown;
    const parsed = submitAnswersSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: { code: "VALIDATION", message: "Invalid input", details: parsed.error.flatten() },
        },
        { status: 400 },
      );
    }
    const answers = await submitAnswers(id, session.user.id, parsed.data);
    return NextResponse.json({ data: answers }, { status: 201 });
  } catch (err) {
    return NextResponse.json(toApiError(err), { status: 500 });
  }
}
