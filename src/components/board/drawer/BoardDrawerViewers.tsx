"use client";
import React from "react";
import type { CommentPresenceUser } from "./useCommentPresence";
import "./board-drawer.css";

/** How many viewer avatars the header shows before folding the rest into "+N". */
const MAX_HEADER_VIEWERS = 3;

export type BoardDrawerViewersProps = {
  viewers: CommentPresenceUser[];
};

/**
 * Avatars of the people who have this drawer open right now, monday style,
 * followed by a divider before the header's buttons. Renders nothing while
 * nobody else is around.
 */
const BoardDrawerViewers: React.FC<BoardDrawerViewersProps> = ({ viewers }) => {
  if (viewers.length === 0) return null;
  const overflow_count = viewers.length - MAX_HEADER_VIEWERS;
  const names = viewers.map((viewer) => viewer.name).join(", ");

  return (
    <>
      <div className="board-drawer__viewers" title={`Viewing now: ${names}`} aria-label={`Viewing now: ${names}`}>
        {viewers.slice(0, MAX_HEADER_VIEWERS).map((viewer) => (
          <span key={viewer.id} className="board-drawer__viewer">
            {viewer.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewer.avatar} alt="" />
            ) : (
              viewer.name.slice(0, 1).toUpperCase()
            )}
          </span>
        ))}
        {overflow_count > 0 && <span className="board-drawer__viewer">+{overflow_count}</span>}
      </div>
      <span className="board-drawer__divider" aria-hidden="true" />
    </>
  );
};

export default BoardDrawerViewers;
