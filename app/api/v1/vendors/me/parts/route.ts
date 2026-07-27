import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { createPartSchema } from "@/features/catalog/schemas";
import { proposePartByVendor, searchPartsForVendor } from "@/features/catalog/service";
import { getVendorContext } from "@/features/vendors/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { hasPermission } from "@/features/auth/rbac";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

/** Vendor-facing catalog search for "Add Inventory Item" — surfaces APPROVED
 * parts even if they have no InventoryItem anywhere yet, unlike the public
 * marketplace search which only shows parts someone already stocks. */
export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const context = await getVendorContext(session.user.id);
    if (!context) throw new NotFoundError("Vendor organization");
    if (!hasPermission(context.membershipRole, PERMISSIONS.VENDOR_INVENTORY_MANAGE)) {
      throw new ForbiddenError("You do not have permission to manage inventory.");
    }

    const { searchParams } = request.nextUrl;
    const query = searchParams.get("query") ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const results = await searchPartsForVendor(query, categoryId);
    return NextResponse.json({ data: results });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

/** A vendor proposing a catalog part their team couldn't find in search — the
 * part lands PENDING_REVIEW (features/catalog/service.ts) until an admin
 * approves it, so it can't yet back an InventoryItem. */
export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const context = await getVendorContext(session.user.id);
    if (!context) throw new NotFoundError("Vendor organization");
    if (!hasPermission(context.membershipRole, PERMISSIONS.VENDOR_INVENTORY_MANAGE)) {
      throw new ForbiddenError("You do not have permission to propose catalog parts.");
    }

    const body = await request.json();
    const parsed = createPartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid part data.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const part = await proposePartByVendor(session.user.id, context.vendorId, parsed.data);
    return NextResponse.json({ data: part }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
