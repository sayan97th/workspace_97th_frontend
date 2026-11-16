"use client";

import "./private-board-notice.scss";

type PrivateBoardNoticeProps = {
  /** `card` is the People picker banner, `inline` the one line caption of the `@mention` picker. */
  variant?: "card" | "inline";
  /** The sentence under the title, kept short so it fits a 360px picker. */
  message?: string;
  /** Shows an "Invite to board" link, the way to give someone access before assigning them. */
  onInviteClick?: () => void;
};

export function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <rect x="3.25" y="7" width="9.5" height="6.75" rx="1.75" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5.25a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="10.35" r="0.95" fill="currentColor" />
    </svg>
  );
}

/**
 * Tells the person picking someone on a private board that only the people added to it are
 * listed, and that nobody else is ever notified, like monday.com's private board hint. The API
 * enforces the same rule on every write and notification, this only makes it visible.
 */
export default function PrivateBoardNotice({
  variant = "card",
  message = "Only people on this board can be assigned or notified.",
  onInviteClick,
}: PrivateBoardNoticeProps) {
  if (variant === "inline") {
    return (
      <div className="private-board-notice private-board-notice--inline" role="note">
        <LockIcon size={12} />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className="private-board-notice" role="note">
      <span className="private-board-notice__icon">
        <LockIcon />
      </span>
      <span className="private-board-notice__text">
        <span className="private-board-notice__title">Private board</span>
        <span className="private-board-notice__message">{message}</span>
      </span>
      {onInviteClick && (
        <button type="button" className="private-board-notice__action" onClick={onInviteClick}>
          Invite to board
        </button>
      )}
    </div>
  );
}
