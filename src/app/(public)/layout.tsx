import React from "react";

/**
 * Pages anyone can open without an account: a board's public form and a
 * shared read only board view. No sidebar, no top bar and no sign in check.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-shell-bg text-shell-text">{children}</div>;
}
