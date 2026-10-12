/**
 * Shared classes of the Slack testing cards, the same look as the Slack settings cards in
 * Administration (see `administration/slack/slackAdminStyles.ts`), without their built in margin
 * because these pages space cards with grid and flex gaps.
 */

export { PRIMARY_BUTTON, SECONDARY_BUTTON, FIELD_LABEL } from "@/components/administration/slack/slackAdminStyles";

export const CARD = "flex min-w-0 flex-col rounded-lg border border-[var(--admin-list-border)] bg-shell-panel p-5";

export const CARD_HEADER = "flex flex-wrap items-start justify-between gap-3";

export const CARD_TITLE = "text-[16px] font-semibold leading-6 text-shell-text";

export const CARD_HINT = "mt-0.5 text-[14px] leading-5 text-shell-text-secondary";

/** Small helper text under a field or row. */
export const FIELD_HINT = "text-[13px] leading-[18px] text-shell-text-faint";

/** Rows inside a card, separated by the Administration divider. */
export const ROW_LIST = "mt-4 divide-y divide-[var(--admin-divider)] border-t border-[var(--admin-divider)]";

const FIELD_BASE =
  "w-full rounded-[4px] border border-[var(--admin-border)] bg-shell-panel px-3 text-[14px] text-shell-text outline-none transition-colors placeholder:text-shell-text-faint hover:border-shell-text focus:border-[var(--admin-button-primary)] disabled:cursor-default disabled:opacity-50 disabled:hover:border-[var(--admin-border)]";

export const SELECT = `${FIELD_BASE} h-10`;

export const TEXTAREA = `${FIELD_BASE} resize-y py-2.5 leading-5`;

/** The "Refresh" text action next to a field label. */
export const TEXT_ACTION =
  "inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[13px] font-medium text-[var(--admin-accent)] transition-colors hover:bg-[var(--admin-hover)] disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent";

/** A gray chip for scopes and small tags. */
export const CHIP = "rounded-[4px] bg-[var(--admin-neutral-bg)] px-1.5 py-0.5 text-[12px] font-medium text-shell-text-secondary";
