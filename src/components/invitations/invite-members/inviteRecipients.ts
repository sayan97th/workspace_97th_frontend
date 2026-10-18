import type { WorkspaceInvitationCandidate } from "@/types/invitation";

/** Mirrors the API's `emails` array cap on `POST /api/workspaces/{slug}/invitations`. */
export const MAX_INVITE_RECIPIENTS = 25;

/** Mirrors the API's `message` max length. */
export const MAX_INVITE_MESSAGE_LENGTH = 1000;

/** Loose check, the API runs the real `email` rule. Matches what people expect to be accepted. */
const EMAIL_PATTERN = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/;

/** Characters that end an address while typing or pasting. */
export const RECIPIENT_SEPARATOR_PATTERN = /[\s,;]+/;

/** One address in the "Invite with email" field, rendered as a chip. */
export type InviteRecipient = {
  /** Lowercased email, used to dedupe. */
  key: string;
  email: string;
  /** Set when the address was picked from the "pool of users" suggestions. */
  full_name: string | null;
  photo_url: string | null;
  job_title: string | null;
  has_pending_invitation: boolean;
  is_valid: boolean;
};

export const isValidInviteEmail = (value: string): boolean => EMAIL_PATTERN.test(value);

/** Strips the wrapping a mail client adds when copying an address, `"Ana" <ana@x.com>` or `mailto:ana@x.com`. */
const cleanAddress = (value: string): string => {
  const bracketed = value.match(/<([^>]+)>/);
  const address = bracketed ? bracketed[1] : value;
  return address
    .replace(/^mailto:/i, "")
    .replace(/^["'(<\[]+|["')>\].]+$/g, "")
    .trim();
};

/**
 * Splits typed or pasted text into addresses. Display names in a pasted `Name <email>` list are
 * dropped, only the part inside the angle brackets is kept.
 */
export const splitRecipientText = (raw: string): string[] => {
  const bracketed = raw.match(/<[^>]+>/g);
  const tokens = bracketed && bracketed.length > 0 ? bracketed : raw.split(RECIPIENT_SEPARATOR_PATTERN);
  return tokens.map(cleanAddress).filter(Boolean);
};

export const recipientFromEmail = (email: string): InviteRecipient => ({
  key: email.toLowerCase(),
  email,
  full_name: null,
  photo_url: null,
  job_title: null,
  has_pending_invitation: false,
  is_valid: isValidInviteEmail(email),
});

export const recipientFromCandidate = (candidate: WorkspaceInvitationCandidate): InviteRecipient => ({
  key: candidate.email.toLowerCase(),
  email: candidate.email,
  full_name: candidate.full_name,
  photo_url: candidate.profile_photo_url,
  job_title: candidate.job_title,
  has_pending_invitation: candidate.has_pending_invitation,
  is_valid: true,
});

export type MergeRecipientsResult = {
  recipients: InviteRecipient[];
  /** Addresses that were already in the field. */
  duplicate_count: number;
  /** Addresses dropped because the field hit {@link MAX_INVITE_RECIPIENTS}. */
  overflow_count: number;
};

/** Appends new recipients, skipping duplicates and anything past the cap. */
export const mergeRecipients = (current: InviteRecipient[], incoming: InviteRecipient[]): MergeRecipientsResult => {
  const recipients = [...current];
  const seen = new Set(current.map((recipient) => recipient.key));
  let duplicate_count = 0;
  let overflow_count = 0;

  incoming.forEach((recipient) => {
    if (seen.has(recipient.key)) {
      duplicate_count += 1;
      return;
    }
    if (recipients.length >= MAX_INVITE_RECIPIENTS) {
      overflow_count += 1;
      return;
    }
    seen.add(recipient.key);
    recipients.push(recipient);
  });

  return { recipients, duplicate_count, overflow_count };
};

/** "Ana Reyes (Designer)", the same label the People picker uses. */
export const recipientLabel = (recipient: Pick<InviteRecipient, "email" | "full_name" | "job_title">): string => {
  if (!recipient.full_name) return recipient.email;
  return recipient.job_title ? `${recipient.full_name} (${recipient.job_title})` : recipient.full_name;
};

/** "1 person" / "3 people". */
export const peopleCount = (count: number): string => (count === 1 ? "1 person" : `${count} people`);
