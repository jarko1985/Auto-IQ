import { auth } from "@/auth";
import type { Permission } from "@/features/auth/permissions";
import { hasPermission, isAccountActive } from "@/features/auth/rbac";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

/** Enforces auth + active-account + RBAC permission for a protected API route.
 * Throws AppError subclasses — pair with lib/api/response.ts's errorResponse(). */
export async function requirePermission(permission: Permission) {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  if (!isAccountActive(session.user.status)) throw new ForbiddenError("Account is not active");
  if (!hasPermission(session.user.role, permission)) throw new ForbiddenError();
  return session.user;
}

/** Auth + active-account only, no RBAC permission check — for resources every
 * account type owns regardless of role (e.g. a user's own notification inbox),
 * where adding a permission to all 10 RoleName entries would be pure ceremony. */
export async function requireAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  if (!isAccountActive(session.user.status)) throw new ForbiddenError("Account is not active");
  return session.user;
}
