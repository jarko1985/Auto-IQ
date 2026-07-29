import type { RoleName, UserStatus } from "@prisma/client";

export interface AccountRecentActivityItem {
  id: string;
  action: string;
  createdAt: string;
}

export interface AccountData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  role: RoleName;
  locale: string;
  status: UserStatus;
  emailVerified: string | null;
  createdAt: string;
  linkedProviders: string[];
  stats: {
    vehicleCount: number;
    completedBookingCount: number;
    diagnosticSessionCount: number;
    autoIqPoints: number;
  };
  recentActivity: AccountRecentActivityItem[];
}
