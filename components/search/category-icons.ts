import {
  Car,
  CalendarCheck,
  Wrench,
  Package,
  Brain,
  Building2,
  Boxes,
  MapPin,
  Users,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_VISUALS: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  vehicles: { icon: Car, color: "#00b8d9", bg: "rgba(0,184,217,0.1)" },
  bookings: { icon: CalendarCheck, color: "#b8790a", bg: "rgba(255,176,32,0.1)" },
  "repair-orders": { icon: Wrench, color: "#b8790a", bg: "rgba(255,176,32,0.1)" },
  orders: { icon: Package, color: "#00b8d9", bg: "rgba(0,184,217,0.1)" },
  diagnostics: { icon: Brain, color: "#00b8d9", bg: "rgba(0,184,217,0.1)" },
  garages: { icon: Building2, color: "#081a2f", bg: "rgba(8,26,47,0.08)" },
  vendors: { icon: Building2, color: "#081a2f", bg: "rgba(8,26,47,0.08)" },
  inventory: { icon: Boxes, color: "#00b8d9", bg: "rgba(0,184,217,0.1)" },
  locations: { icon: MapPin, color: "#081a2f", bg: "rgba(8,26,47,0.08)" },
  mechanics: { icon: Users, color: "#081a2f", bg: "rgba(8,26,47,0.08)" },
  parts: { icon: Package, color: "#00b8d9", bg: "rgba(0,184,217,0.1)" },
  "diagnostic-feedback": { icon: MessageSquare, color: "#b8790a", bg: "rgba(255,176,32,0.1)" },
};

export const DEFAULT_CATEGORY_VISUAL = {
  icon: Package,
  color: "#75859f",
  bg: "rgba(117,133,159,0.1)",
};
