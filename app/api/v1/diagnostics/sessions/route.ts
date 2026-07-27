import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSessionSchema, listSessionsSchema } from "@/features/diagnostics/schemas";
import { startSession, listSessions } from "@/features/diagnostics/service";
import { toApiError } from "@/lib/errors";
import type { SessionStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 },
      );
    }
    const { searchParams } = req.nextUrl;
    const parsed = listSessionsSchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      limit: searchParams.get("limit") ?? 20,
      offset: searchParams.get("offset") ?? 0,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: { code: "VALIDATION", message: "Invalid query", details: parsed.error.flatten() },
        },
        { status: 400 },
      );
    }
    const result = await listSessions(session.user.id, {
      status: parsed.data.status as SessionStatus | undefined,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
    return NextResponse.json({
      data: result.sessions,
      meta: { total: result.total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (err) {
    return NextResponse.json(toApiError(err), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 },
      );
    }
    const body = (await req.json()) as unknown;
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: { code: "VALIDATION", message: "Invalid input", details: parsed.error.flatten() },
        },
        { status: 400 },
      );
    }
    const diagSession = await startSession(session.user.id, parsed.data);
    return NextResponse.json({ data: diagSession }, { status: 201 });
  } catch (err) {
    return NextResponse.json(toApiError(err), { status: 500 });
  }
}
