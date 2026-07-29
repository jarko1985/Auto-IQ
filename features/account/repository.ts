import { db } from "@/lib/db";
import type { AuditAction, Prisma } from "@prisma/client";

export async function findAccountProfile(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      role: true,
      locale: true,
      status: true,
      emailVerified: true,
      createdAt: true,
    },
  });
}

export async function updateProfile(userId: string, data: { name: string; phone?: string | null }) {
  return db.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, phone: true },
  });
}

export async function findPasswordHash(userId: string) {
  return db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
}

export async function updatePasswordHash(userId: string, passwordHash: string) {
  return db.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function updateAvatar(userId: string, image: string) {
  return db.user.update({ where: { id: userId }, data: { image }, select: { id: true, image: true } });
}

export async function updateLocale(userId: string, locale: string) {
  return db.user.update({ where: { id: userId }, data: { locale }, select: { id: true, locale: true } });
}

export async function findLinkedProviders(userId: string) {
  const accounts = await db.account.findMany({
    where: { userId },
    select: { provider: true },
  });
  return accounts.map((a) => a.provider);
}

export async function getAccountStats(userId: string) {
  const [vehicleCount, completedBookingCount, diagnosticSessionCount, paidInvoices] =
    await Promise.all([
      db.customerVehicle.count({ where: { userId, deletedAt: null } }),
      db.appointment.count({ where: { customerId: userId, status: "COMPLETED" } }),
      db.diagnosticSession.count({ where: { userId } }),
      db.invoice.aggregate({
        where: { customerId: userId, status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
        _sum: { totalMinorUnits: true },
      }),
    ]);

  return {
    vehicleCount,
    completedBookingCount,
    diagnosticSessionCount,
    totalPaidMinorUnits: paidInvoices._sum.totalMinorUnits ?? 0,
  };
}

export async function listRecentActivity(userId: string, limit: number) {
  return db.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, action: true, createdAt: true, resourceId: true },
  });
}

export async function createAuditLog(data: {
  userId: string;
  action: AuditAction;
  metadata?: Prisma.InputJsonValue;
}) {
  return db.auditLog.create({
    data: { user: { connect: { id: data.userId } }, action: data.action, metadata: data.metadata },
  });
}
