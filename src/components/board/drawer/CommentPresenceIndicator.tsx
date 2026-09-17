"use client";
import React from "react";
import type { CommentPresenceUser } from "./useCommentPresence";

export type CommentPresenceIndicatorProps = {
  presence_users: CommentPresenceUser[];
  typing_names: string[];
};

/** Live "who's viewing" avatar stack + "X is typing…" line, shown under a thread's composer while the drawer's presence channel is joined. Renders nothing once both are empty. */
const CommentPresenceIndicator: React.FC<CommentPresenceIndicatorProps> = ({ presence_users, typing_names }) => {
  if (presence_users.length === 0 && typing_names.length === 0) return null;

  return (
    <div className="mt-2 flex items-center gap-2 text-[11.5px] text-shell-text-faint">
      {presence_users.length > 0 && (
        <div className="flex items-center -space-x-1.5">
          {presence_users.slice(0, 4).map((viewer) => (
            <span
              key={viewer.id}
              title={viewer.name}
              className="flex h-[18px] w-[18px] items-center justify-center overflow-hidden rounded-full bg-shell-hover-strong text-[8px] font-bold text-shell-text-secondary ring-2 ring-shell-panel"
            >
              {viewer.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={viewer.avatar} alt={viewer.name} className="h-full w-full object-cover" />
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
