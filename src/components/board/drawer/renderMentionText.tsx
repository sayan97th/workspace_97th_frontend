import React from "react";

const MENTION_PATTERN = /(@[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)/g;

/** Splits a comment body on `@Full Name` mentions and highlights them, matching the approved design. */
export const renderMentionText = (body: string): React.ReactNode => {
  const parts = body.split(MENTION_PATTERN);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, index) =>
        /^@[A-Z]/.test(part) ? (
          <span key={index} className="font-semibold text-[#7fb2ff]">
            {part}
          </span>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </span>
  );
};
