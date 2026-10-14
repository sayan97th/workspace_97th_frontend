"use client";
import React, { useEffect, useState } from "react";
import { boardDocService } from "@/services/board-doc.service";
import type { PublicDocDto } from "@/types/board-doc";
import SharedDocReader from "./SharedDocReader";

type PageState = { kind: "loading" } | { kind: "ready"; doc: PublicDocDto } | { kind: "unavailable" };

/**
 * A Doc opened through its public link (the Share dialog's "Share public
 * link"), read only through `SharedDocReader`. No account needed.
 */
const SharedDocPage: React.FC<{ token: string }> = ({ token }) => {
  const [state, setState] = useState<PageState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    boardDocService
      .openPublicDoc(token)
      .then((doc) => {
        if (!cancelled) setState({ kind: "ready", doc });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (state.kind === "ready") document.title = state.doc.label;
  }, [state]);

  if (state.kind === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-[14px] text-shell-text-faint">Loading doc…</div>;
  }

  if (state.kind === "unavailable") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
        <h1 className="font-heading text-[24px] font-semibold text-shell-text">This link is not available</h1>
        <p className="text-[14px] text-shell-text-muted">The doc was unshared or removed. Ask its owner for a new link.</p>
      </div>
    );
  }

  return <SharedDocReader doc={state.doc} />;
};

export default SharedDocPage;
