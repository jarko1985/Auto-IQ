import { NotificationBell } from "@/components/notifications/notification-bell";

export function PortalTopbar({ notificationsHref }: { notificationsHref: string }) {
  return (
    <header
      className="no-print"
      style={{
        height: "3.5rem",
        flexShrink: 0,
        borderBottom: "1px solid #e5e8eb",
        backgroundColor: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 1.5rem",
      }}
    >
      <NotificationBell centerHref={notificationsHref} />
    </header>
  );
}
