import { Bell, BriefcaseBusiness, Globe, History, LockKeyhole, UserRound, type LucideIcon } from "lucide-react";
import type { ProfileSectionId } from "./types";

export type ProfileNavItem = {
  id: ProfileSectionId;
  label: string;
  /** Card title, the rail label when omitted. */
  title?: string;
  description: string;
  icon: LucideIcon;
};

/** Every My Profile section in rail order, with the title and subtitle shown at the top of its card. */
export const PROFILE_NAV_ITEMS: ProfileNavItem[] = [
  {
    id: "personal",
    label: "Personal info",
    description: "Your name, title and contact details, as your teammates see them.",
    icon: UserRound,
  },
  {
    id: "working",
    label: "Working status",
    description: "Let everyone know where you are working from and when you are away.",
    icon: BriefcaseBusiness,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Choose what you hear about and where, in app, by email, on Slack or on your desktop.",
    icon: Bell,
  },
  {
    id: "language",
    label: "Language & region",
    description: "Your language, time zone and how dates and times are shown.",
    icon: Globe,
  },
  {
    id: "password",
    label: "Password",
    title: "Password and security",
    description: "Change your password and protect your account with two-factor authentication.",
    icon: LockKeyhole,
  },
  {
    id: "sessions",
    label: "Session history",
    description: "Devices that are signed in to your account. Log out any you do not recognize.",
    icon: History,
  },
];

export const PROFILE_SECTION_IDS: ProfileSectionId[] = PROFILE_NAV_ITEMS.map((item) => item.id);

export const findProfileNavItem = (id: ProfileSectionId): ProfileNavItem =>
  PROFILE_NAV_ITEMS.find((item) => item.id === id) ?? PROFILE_NAV_ITEMS[0];
