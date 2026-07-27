import type { NotificationCategory, NotificationEventType } from "@prisma/client";

export interface NotificationListItem {
  id: string;
  eventType: NotificationEventType;
  category: NotificationCategory;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  data: NotificationListItem[];
  meta: { total: number; unreadCount: number; limit: number; offset: number };
}
