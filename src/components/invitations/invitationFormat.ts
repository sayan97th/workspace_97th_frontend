import { differenceInCalendarDays, format, formatDistanceToNowStrict, isValid } from "date-fns";

/** Status tones shared by pills, summary cards and expiry lines. Each maps to `data-tone` in invitations.scss. */
export type InvitationTone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";

/** Any invitation status, workspace or account wide, they use the same three values. */
export type InvitationStatusValue = "pending" | "expired" | "accepted";

/** A pending invitation that expires within this many days is flagged in the warning tone. */
const EXPIRING_SOON_DAYS = 2;

const AVATAR_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ["#579bfc", "#0073ea"],
  ["#9d50dd", "#6a2fa8"],
  ["#00c875", "#00854d"],
  ["#fdab3d", "#c47a12"],
  ["#e2445c", "#a8243a"],
  ["#66ccff", "#1f8fc7"],
  ["#ff7575", "#c94b4b"],
  ["#037f4c", "#025a36"],
];

const parseDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return isValid(date) ? date : null;
};

/** Deterministic avatar gradient for an email, so the same address always gets the same color. */
export const avatarGradientForEmail = (email: string): readonly [string, string] => {
  let hash = 0;
  for (let index = 0; index < email.length; index += 1) {
    hash = (hash * 31 + email.charCodeAt(index)) | 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

/** Up to two initials from an email's local part ("jane.doe@x.com" -> "JD", "amanda@x.com" -> "AM"). */
export const initialsFromEmail = (email: string): string => {
  const local_part = email.split("@")[0] ?? "";
  const words = local_part.split(/[._\-+]+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return local_part.slice(0, 2).toUpperCase() || "?";
};

/** Up to two initials from a full name ("Josh Moody" -> "JM"). */
export const initialsFromFullName = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

/** "Oct 17, 2026", or "None" when there is no date. */
export const formatInvitationDate = (iso: string | null | undefined): string => {
  const date = parseDate(iso);
  return date ? format(date, "MMM d, yyyy") : "None";
};

/** "Oct 17, 2026 at 3:42 PM", for tooltips that explain a short relative label. */
export const formatInvitationDateTime = (iso: string | null | undefined): string => {
  const date = parseDate(iso);
  return date ? format(date, "MMM d, yyyy 'at' h:mm a") : "Unknown date";
};

/** "3 days ago" style relative label. */
export const formatRelative = (iso: string | null | undefined): string => {
  const date = parseDate(iso);
  return date ? formatDistanceToNowStrict(date, { addSuffix: true }) : "";
};

export type InvitationExpiryInfo = {
  label: string;
  tooltip: string;
  /** Unset keeps the faint default color. */
  tone?: InvitationTone;
};

/**
 * The small line under a status pill: when a pending link stops working, when an expired one
 * did, or when the person joined. Null when there is nothing worth saying (no expiry date).
 */
export const describeInvitationExpiry = (
  status: InvitationStatusValue,
  expires_at: string | null | undefined,
  accepted_at: string | null | undefined
): InvitationExpiryInfo | null => {
  if (status === "accepted") {
    const accepted = parseDate(accepted_at);
    return accepted
      ? { label: `Joined ${formatRelative(accepted_at)}`, tooltip: `Accepted on ${formatInvitationDateTime(accepted_at)}` }
      : null;
  }

  const expires = parseDate(expires_at);
  if (!expires) {
    return status === "pending" ? { label: "Never expires", tooltip: "This invitation link has no expiry date." } : null;
  }

  if (status === "expired") {
    return {
      label: `Expired ${formatRelative(expires_at)}`,
      tooltip: `The link stopped working on ${formatInvitationDateTime(expires_at)}.`,
      tone: "danger",
    };
  }

  const days_left = differenceInCalendarDays(expires, new Date());
  return {
    label: `Expires ${formatRelative(expires_at)}`,
    tooltip: `The link works until ${formatInvitationDateTime(expires_at)}.`,
    tone: days_left <= EXPIRING_SOON_DAYS ? "warning" : undefined,
  };
};

/** Share of `count` in `total`, as a CSS width for the summary card meter. */
export const meterWidth = (count: number, total: number): string =>
  total > 0 ? `${Math.round((count / total) * 100)}%` : "0%";
