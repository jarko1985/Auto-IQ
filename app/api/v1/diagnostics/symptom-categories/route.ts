import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSymptomCategories } from "@/features/diagnostics/service";
import { toApiError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 },
      );
    }
    const categories = await getSymptomCategories();
    return NextResponse.json({ data: categories });
  } catch (err) {
    return NextResponse.json(toApiError(err), { status: 500 });
  }
}
