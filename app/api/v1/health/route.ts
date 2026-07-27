import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;

    const latencyMs = Date.now() - start;

    logger.debug({ latencyMs }, "Health check passed");

    return NextResponse.json({
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version ?? "unknown",
        environment: process.env.NODE_ENV,
        database: "ok",
        latencyMs,
      },
    });
  } catch (error) {
    logger.error({ error }, "Health check failed — database unreachable");

    return NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Database connection failed",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 },
    );
  }
}
