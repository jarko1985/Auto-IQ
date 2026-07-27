import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { deleteVendorDocument } from "@/features/vendors/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ docId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { docId } = await params;
    await deleteVendorDocument(session.user.id, docId);
    return NextResponse.json({ data: { id: docId } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
