import { Building2, Coffee, Heart, House, Plane, Sun, Thermometer, type LucideIcon } from "lucide-react";

/** Icon for each working status key from `PROFILE_STATUS_OPTIONS`, shared by the header pill and the status tiles. */
export const PROFILE_STATUS_ICONS: Record<string, LucideIcon> = {
  office: Building2,
  wfh: House,
  sick: Thermometer,
  break: Coffee,
  ooo: Plane,
  outside: Sun,
  family: Heart,
};

/** Statuses that mean the person is not available, shown with an orange dot instead of green. */
export const AWAY_STATUS_KEYS = ["sick", "break", "ooo", "family"];
