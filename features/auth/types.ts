import type { RoleName, UserStatus } from "@prisma/client";

export type { RoleName, UserStatus };

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  status: UserStatus;
  role: RoleName;
}

export interface AuthenticatedRequest {
  userId: string;
  userStatus: UserStatus;
  globalRole: RoleName;
  organizationId?: string;
  membershipRoles?: RoleName[];
}
