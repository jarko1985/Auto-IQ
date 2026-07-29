import { SettingsView } from "@/components/account/settings-view";

export default function AdminSettingsPage() {
  return <SettingsView notificationPreferencesHref="/admin/notifications/preferences" />;
}
