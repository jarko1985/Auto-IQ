import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { searchPartsSchema } from "@/features/catalog/schemas";
import { searchParts } from "@/features/catalog/service";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const { searchParams } = request.nextUrl;
    const parsed = searchPartsSchema.safeParse({
      query: searchParams.get("query") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      makeName: searchParams.get("makeName") ?? undefined,
      modelName: searchParams.get("modelName") ?? undefined,
      year: searchParams.get("year") ?? undefined,
      engineCode: searchParams.get("engineCode") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid search query.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const results = await searchParts(parsed.data);
    return NextResponse.json({ data: results, meta: { count: results.length } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
