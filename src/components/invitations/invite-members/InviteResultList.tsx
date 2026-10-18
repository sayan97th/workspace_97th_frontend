import React from "react";
import type { SkippedInvitation } from "@/types/invitation";
import { CheckIcon, ClockIcon, CloseIcon, MemberIcon } from "@/icons/workspace-icons";
import InvitationAvatar from "../InvitationAvatar";
import InvitationPill from "../InvitationPill";
import type { InvitationTone } from "../invitationFormat";
import { recipientLabel, type InviteRecipient } from "./inviteRecipients";

/** Outcome of a send, per address, so the dialog can show who got what. */
export type InviteMembersResult = {
  invited_emails: string[];
  /** Subset of `invited_emails` that already had an open invitation. */
  resent_emails: string[];
  skipped: SkippedInvitation[];
};

type ResultOutcome = "sent" | "resent" | SkippedInvitation["reason"];

const OUTCOME_META: Record<ResultOutcome, { label: string; tone: InvitationTone; hint: string; Icon: typeof CheckIcon }> = {
  sent: { label: "Sent", tone: "success", hint: "They got an email with a link to join. It works for 7 days.", Icon: CheckIcon },
  resent: { label: "Resent", tone: "info", hint: "They already had an open invitation, it was sent again for 7 more days.", Icon: ClockIcon },
  already_member: { label: "Already a member", tone: "neutral", hint: "This person is already in the workspace.", Icon: MemberIcon },
  domain_not_approved: {
    label: "Domain not approved",
    tone: "danger",
    hint: "Your account only allows invitations to approved email domains. An admin can change this in Administration.",
    Icon: CloseIcon,
  },
};

export type InviteResultListProps = {
  result: InviteMembersResult;
  /** The chips that were sent, so rows keep the picked person's name and photo. */
  recipients: InviteRecipient[];
};

/** One row per address with its outcome pill, then a short tally above the list. */
const InviteResultList: React.FC<InviteResultListProps> = ({ result, recipients }) => {
  const recipient_by_key = new Map(recipients.map((recipient) => [recipient.key, recipient]));
  const resent_keys = new Set(result.resent_emails.map((email) => email.toLowerCase()));

  const rows: Array<{ email: string; outcome: ResultOutcome }> = [
    ...result.invited_emails.map((email) => ({
      email,
      outcome: (resent_keys.has(email.toLowerCase()) ? "resent" : "sent") as ResultOutcome,
    })),
    ...result.skipped.map((skipped) => ({ email: skipped.email, outcome: skipped.reason as ResultOutcome })),
  ];

  const tally = (["sent", "resent", "already_member", "domain_not_approved"] as const)
    .map((outcome) => ({ outcome, count: rows.filter((row) => row.outcome === outcome).length }))
    .filter((entry) => entry.count > 0);

  return (
    <div className="inv-result">
      <div className="inv-result-tally" aria-label="Summary">
        {tally.map(({ outcome, count }) => {
          const meta = OUTCOME_META[outcome];
          return (
            <InvitationPill key={outcome} tone={meta.tone} icon={<meta.Icon size={11} />} tooltip={meta.hint}>
              {count} {meta.label.toLowerCase()}
            </InvitationPill>
          );
        })}
      </div>

      <ul className="inv-result-list">
        {rows.map((row) => {
          const recipient = recipient_by_key.get(row.email.toLowerCase());
          const meta = OUTCOME_META[row.outcome];
          return (
            <li key={`${row.outcome}-${row.email}`} className="inv-result-row">
              <span className="inv-person" data-faded={row.outcome === "sent" || row.outcome === "resent" ? "false" : "true"}>
                <InvitationAvatar
                  email={row.email}
                  full_name={recipient?.full_name}
                  photo_url={recipient?.photo_url}
                  size={32}
                />
                <span className="min-w-0">
                  <span className="inv-person-email">{recipient ? recipientLabel(recipient) : row.email}</span>
                  {recipient?.full_name ? <span className="inv-person-meta">{row.email}</span> : null}
                </span>
              </span>
              <InvitationPill tone={meta.tone} icon={<meta.Icon size={11} />} tooltip={meta.hint}>
                {meta.label}
              </InvitationPill>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default InviteResultList;
