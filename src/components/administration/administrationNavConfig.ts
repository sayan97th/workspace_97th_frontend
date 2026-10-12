import { ChartLine, Contact, FileStack, Lock, Network, Paintbrush, Settings, Shield, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { SLACK_SETUP_ROLES } from "@/lib/slackSetup";
import type { AdminNavGroupId, AdminSectionId } from "./types";

export type AdministrationNavItem = {
  id: AdminSectionId;
  label: string;
  /** Page heading when it differs from the rail label, e.g. "Users" opens "User management". */
  title?: string;
  /** Subtitle under the page heading. */
  description: string;
  /** Restricts the item to these platform roles, mirroring the API route's role gate. Visible to every Administration role when absent. */
  roles?: string[];
  /**
   * Opens a standalone page instead of a section inside the view, like Teams. The rail links to
   * it with `?from=` so the page's close button returns to Administration.
   */
  href?: string;
};

/** A collapsible rail group with child pages, like monday's "Directory" or "Security". */
export type AdministrationNavGroupNode = {
  kind: "group";
  id: AdminNavGroupId;
  label: string;
  icon: LucideIcon;
  items: AdministrationNavItem[];
};

/** A rail page shown at the top level with its own icon, like monday's "Tidy up" or "Permissions". */
export type AdministrationNavPageNode = {
  kind: "page";
  icon: LucideIcon;
  item: AdministrationNavItem;
};

export type AdministrationNavNode = AdministrationNavGroupNode | AdministrationNavPageNode;

/** Roles allowed on the admin only pages (the API gates them with `role:super_admin,admin`). */
const ADMIN_ROLES = ["super_admin", "admin"];

/** The page the view opens on when the URL names no section, or one that no longer exists. */
export const DEFAULT_ADMINISTRATION_SECTION: AdminSectionId = "account";

/**
 * Single source of truth for the Administration left rail, in display order: the collapsible
 * groups with their child pages, then the top level pages, same layout as monday.com's
 * administration. Page titles and subtitles come from here too, so adding, removing or
 * reordering a page is a one place edit.
 *
 * The old Profile (account name and URL), Branding (email header) and Customization landing
 * pages were dropped: the company name, logo and brand now live on the Organization page, and
 * neither the account URL nor the email header was used anywhere else in the product.
 */
export const ADMINISTRATION_NAV: AdministrationNavNode[] = [
  {
    kind: "group",
    id: "general",
    label: "General",
    icon: Settings,
    items: [
      {
        id: "account",
        label: "Account",
        title: "Account settings",
        description: "Account wide preferences for the work week, the Timeline and the home page.",
      },
      {
        id: "user_defaults",
        label: "New user defaults",
        description: "The language, timezone and formats everyone who joins the account starts with.",
      },
    ],
  },
  {
    kind: "group",
    id: "customization",
    label: "Customization",
    icon: SlidersHorizontal,
    items: [
      {
        id: "organization",
        label: "Organization",
        description:
          "Brand the whole workspace with your company's identity: the logo in the top left corner, colors, favicon, contact details, the sign in page and announcements.",
      },
      {
        id: "profile_fields",
        label: "Profile fields",
        description:
          "Add fields to every user's profile, like office location or employee ID. Each field becomes a filterable column in the Users table.",
      },
    ],
  },
  {
    kind: "group",
    id: "directory",
    label: "Directory",
    icon: Contact,
    items: [
      {
        id: "users",
        label: "Users",
        title: "User management",
        description:
          "Manage everyone on this account, change roles, assign departments or deactivate a user. Click a person to see their details.",
      },
      {
        id: "teams",
        label: "Teams",
        description: "Group people into teams with owners, sub-teams and the boards each team works on.",
        href: "/teams",
      },
      {
        id: "invitations",
        label: "Invitations",
        description: "Everyone invited to the account, whether they joined, are still pending or let the invitation expire.",
      },
      {
        id: "departments",
        label: "Departments",
        title: "Manage departments",
        description:
          "Organize by location, business unit, cost center or department. Assign owners so they can manage each unit.",
      },
      {
        id: "board_ownership",
        label: "Board ownership",
        description: "Move the boards of someone who left to a new owner, and give an owner to boards that have none.",
      },
    ],
  },
  {
    kind: "group",
    id: "security",
    label: "Security",
    icon: Shield,
    items: [
      {
        id: "authentication",
        label: "Authentication",
        title: "Security and authentication",
        description: "Control how people sign up for and log into this account.",
      },
      {
        id: "sessions",
        label: "Sessions",
        title: "Active user sessions",
        description: "View and control the sessions of every user on this account.",
      },
      {
        id: "audit",
        label: "Audit log",
        description: "See who made changes to security sensitive settings across this account, and when.",
      },
      {
        id: "advanced",
        label: "Advanced",
        title: "Advanced security",
        description: "Panic mode for emergencies and how long a session lasts before people have to sign in again.",
      },
    ],
  },
  {
    kind: "group",
    id: "connections",
    label: "Connections",
    icon: Network,
    items: [
      {
        id: "integrations",
        label: "Integrations",
        description: "Connect the account to Slack and the other apps your team uses for notifications and automations.",
      },
      {
        id: "slack",
        label: "Slack settings",
        title: "Slack",
        description:
          "Set up Slack once for the whole account. After that, members only use \"Connect my Slack\" in My Profile to get their notifications as Slack messages.",
        roles: SLACK_SETUP_ROLES,
      },
    ],
  },
  {
    kind: "page",
    icon: ChartLine,
    item: {
      id: "usage",
      label: "Usage stats",
      description:
        "See how the account is being used. A person counts as active on a day they signed in, changed an item, posted an update or made a recorded change.",
    },
  },
  {
    kind: "page",
    icon: Paintbrush,
    item: {
      id: "tidy_up",
      label: "Tidy up",
      description:
        "Keep the account clean. These boards had no item changes, updates or board activity in the chosen period. Archive them, or reassign them to someone who will pick them up.",
      roles: ADMIN_ROLES,
    },
  },
  {
    kind: "page",
    icon: FileStack,
    item: {
      id: "content_directory",
      label: "Content directory",
      description:
        "Browse every board in the account, including private ones, see who owns what and how active it is, and clean up in bulk.",
      roles: ADMIN_ROLES,
    },
  },
  {
    kind: "page",
    icon: Lock,
    item: {
      id: "permissions",
      label: "Permissions",
      description: "Define the default account level permissions for your users.",
    },
  },
];

/** Every rail page, groups flattened, in display order. */
export const ADMINISTRATION_NAV_ITEMS: AdministrationNavItem[] = ADMINISTRATION_NAV.flatMap((node) =>
  node.kind === "group" ? node.items : [node.item]
);

/** Whether a user holding `hasAnyRole` may open `item`. */
export const canSeeAdministrationItem = (
  item: AdministrationNavItem,
  hasAnyRole: (...roles: string[]) => boolean
): boolean => !item.roles || hasAnyRole(...item.roles);

export const findAdministrationItem = (section_id: AdminSectionId): AdministrationNavItem | undefined =>
  ADMINISTRATION_NAV_ITEMS.find((item) => item.id === section_id);

/** Narrows a `?section=` value to a rail page shown inside the view, `null` when it names none (or a standalone page). */
export const parseAdministrationSection = (value: string | null): AdminSectionId | null =>
  (value ? ADMINISTRATION_NAV_ITEMS.find((candidate) => candidate.id === value && !candidate.href)?.id : undefined) ?? null;

export const administrationGroupForSection = (section_id: AdminSectionId): AdminNavGroupId | null => {
  const group = ADMINISTRATION_NAV.find(
    (node): node is AdministrationNavGroupNode => node.kind === "group" && node.items.some((item) => item.id === section_id)
  );
  return group?.id ?? null;
};
