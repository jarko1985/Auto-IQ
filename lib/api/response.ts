import { NextResponse } from "next/server";
import { isAppError, toApiError } from "@/lib/errors";

/** Maps a thrown error to a JSON response, respecting AppError's own statusCode. */
export function errorResponse(error: unknown, requestId?: string) {
  const status = isAppError(error) ? error.statusCode : 500;
  return NextResponse.json(toApiError(error, requestId), { status });
}
