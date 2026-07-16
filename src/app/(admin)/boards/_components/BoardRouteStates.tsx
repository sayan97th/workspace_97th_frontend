import React from "react";

/** Centered error/empty message shared by every `/boards/{id}` route. */
export const CenteredMessage: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 bg-shell-bg px-6 text-center">
    <h2 className="text-lg font-semibold text-shell-text">{title}</h2>
    <p className="max-w-sm text-[13.5px] text-shell-text-muted">{detail}</p>
  </div>
);

/** Full-height loading spinner shown while a board is being resolved. */
export const BoardLoadingSpinner: React.FC = () => (
  <div className="flex h-full items-center justify-center bg-shell-bg">
    <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
  </div>
);
