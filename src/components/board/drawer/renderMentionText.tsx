import React from "react";
import { MENTION_HIGHLIGHT_CLASS, MENTION_PATTERN } from "./mentionHighlight";

/** Splits a comment body on `@Full Name` mentions and highlights them, matching the approved design. */
export const renderMentionText = (body: string): React.ReactNode => {
  const parts = body.split(MENTION_PATTERN);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, index) =>
        /^@[A-Z]/.test(part) ? (
          <span key={index} className={MENTION_HIGHLIGHT_CLASS}>
            {part}
          </span>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </span>
  );
};
