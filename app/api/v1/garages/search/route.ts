import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { searchGaragesSchema } from "@/features/bookings/schemas";
import { searchGarages, toGarageSearchResult } from "@/features/bookings/service";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const { searchParams } = request.nextUrl;
    const parsed = searchGaragesSchema.safeParse({
      query: searchParams.get("query") ?? undefined,
      emirate: searchParams.get("emirate") ?? undefined,
      serviceTypes: searchParams.get("serviceTypes") ?? undefined,
      vehicleType: searchParams.get("vehicleType") ?? undefined,
      makeId: searchParams.get("makeId") ?? undefined,
      lat: searchParams.get("lat") ?? undefined,
      lng: searchParams.get("lng") ?? undefined,
      radiusKm: searchParams.get("radiusKm") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
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

    const { garages, total } = await searchGarages(parsed.data);
    return NextResponse.json({
      data: garages.map(toGarageSearchResult),
      meta: { total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
