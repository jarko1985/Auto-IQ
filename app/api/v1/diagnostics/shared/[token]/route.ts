import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSharedDiagnosticResult } from "@/features/diagnostics/service";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

/** Public — no auth. The token itself is the credential (see
 * features/diagnostics/service.ts's getSharedDiagnosticResult). */
export async function GET(_request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const { token } = await params;
    const result = await getSharedDiagnosticResult(token);
    return NextResponse.json({ data: result });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
