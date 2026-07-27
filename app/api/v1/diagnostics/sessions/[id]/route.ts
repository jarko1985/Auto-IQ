import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateSessionSchema } from "@/features/diagnostics/schemas";
import { getSession, updateSession } from "@/features/diagnostics/service";
import { toApiError } from "@/lib/errors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 },
      );
    }
    const { id } = await params;
    const diagSession = await getSession(id, session.user.id);
    return NextResponse.json({ data: diagSession });
  } catch (err) {
    return NextResponse.json(toApiError(err), { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const parsed = updateSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: { code: "VALIDATION", message: "Invalid input", details: parsed.error.flatten() },
        },
        { status: 400 },
      );
    }
    const diagSession = await updateSession(id, session.user.id, parsed.data);
    return NextResponse.json({ data: diagSession });
  } catch (err) {
    return NextResponse.json(toApiError(err), { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 },
      );
    }
    const { id } = await params;
    await updateSession(id, session.user.id, {
      status: "CANCELLED",
      cancelledReason: "Cancelled by user",
    });
    return NextResponse.json({ data: { cancelled: true } });
  } catch (err) {
    return NextResponse.json(toApiError(err), { status: 500 });
  }
}
