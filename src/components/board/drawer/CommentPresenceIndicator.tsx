"use client";
import React from "react";
import type { CommentPresenceUser } from "./useCommentPresence";
import "./board-drawer.css";

export type CommentPresenceIndicatorProps = {
  presence_users: CommentPresenceUser[];
  typing_names: string[];
};

/** Live "who's viewing" avatar stack + "X is typing..." line, shown under a thread's composer while the drawer's presence channel is joined. Renders nothing once both are empty. */
const CommentPresenceIndicator: React.FC<CommentPresenceIndicatorProps> = ({ presence_users, typing_names }) => {
  if (presence_users.length === 0 && typing_names.length === 0) return null;

  return (
    <div className="update-presence">
      {presence_users.length > 0 && (
        <div className="board-drawer__viewers">
          {presence_users.slice(0, 4).map((viewer) => (
            <span key={viewer.id} title={viewer.name} className="board-drawer__viewer !h-5 !w-5 !text-[9px]">
              {viewer.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={viewer.avatar} alt={viewer.name} />
              ) : (
                viewer.name.slice(0, 1).toUpperCase()
              )}
            </span>
          ))}
        </div>
      )}
      {typing_names.length > 0 && (
        <span className="italic">
          {typing_names.length === 1
            ? `${typing_names[0]} is typing…`
            : `${typing_names.slice(0, -1).join(", ")} and ${typing_names[typing_names.length - 1]} are typing…`}
        </span>
      )}
    </div>
  );
};

export default CommentPresenceIndicator;
