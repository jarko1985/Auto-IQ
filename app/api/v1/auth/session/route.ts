import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ data: null }, { status: 200 });
  }

  return NextResponse.json({
    data: {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        status: session.user.status,
        role: session.user.role,
      },
    },
  });
}
