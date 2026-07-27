import type { DefaultSession } from "next-auth";
import type { UserStatus, RoleName } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      status: UserStatus;
      role: RoleName;
    } & DefaultSession["user"];
  }

  interface User {
    status: UserStatus;
    role: RoleName;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    status: UserStatus;
    role: RoleName;
    /** Epoch ms — see features/auth/session-refresh.ts's shouldRefreshSessionRole(). */
    roleCheckedAt?: number;
  }
}
