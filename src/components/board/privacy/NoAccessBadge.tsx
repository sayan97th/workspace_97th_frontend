"use client";

import { LockIcon } from "./PrivateBoardNotice";
import "./private-board-notice.scss";

/**
 * Small lock pinned to the corner of an avatar, for someone shown on a private board who cannot
 * open it (see `hasNoBoardAccess`). The parent must be `position: relative`.
 */
export default function NoAccessBadge({ size = 14 }: { size?: number }) {
  return (
    <span className="no-access-badge" style={{ width: size, height: size }} aria-hidden="true">
      <LockIcon size={Math.round(size * 0.7)} />
    </span>
  );
}
