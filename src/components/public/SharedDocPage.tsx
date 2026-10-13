"use client";
import React, { useEffect, useState } from "react";
import { ListTree } from "lucide-react";
import { DocEditorProvider, DocEditorSurface, DocOutline } from "@/components/board/doc/editor";
import { DocMetaRow, DocTypeIcon } from "@/components/board/doc/DocHeaderParts";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";
import { boardDocService } from "@/services/board-doc.service";
import type { PublicDocDto } from "@/types/board-doc";

type PageState = { kind: "loading" } | { kind: "ready"; doc: PublicDocDto } | { kind: "unavailable" };

const noop = () => undefined;

/**
 * A Doc opened through its public link (the Share dialog's "Share public
 * link"): the title, the creator row and the body, read only, laid out like
 * the doc's Presentation mode. No account needed.
 */
const SharedDocPage: React.FC<{ token: string }> = ({ token }) => {
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [is_outline_open, setIsOutlineOpen] = useState(false);

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

  const { doc } = state;

  return (
    <ToastProvider>
      <div className="doc-theme min-h-screen bg-[var(--doc-page)]">
        <DocEditorProvider initial_content={doc.content} onChange={noop} editable={false}>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--doc-border)] bg-[var(--doc-surface)] px-4 py-2">
            <button
              type="button"
              className={`doc-icon-button${is_outline_open ? " is-active" : ""}`}
              aria-label={is_outline_open ? "Hide outline" : "Show outline"}
              title={is_outline_open ? "Hide outline" : "Show outline"}
              aria-pressed={is_outline_open}
              onClick={() => setIsOutlineOpen((current) => !current)}
            >
              <ListTree size={18} />
            </button>
            <span className="rounded-full bg-[var(--doc-hover-soft)] px-3 py-1 text-[12px] font-medium text-[var(--doc-text-secondary)]">View only</span>
          </div>
          <div className="flex">
            {is_outline_open && (
              <aside className="hidden flex-none border-r border-[var(--doc-border)] md:block">
                <DocOutline />
              </aside>
            )}
            <main className="mx-auto w-full max-w-[1000px] min-w-0 px-4 pt-12 sm:px-16">
              <div className="doc-presentation-title-row">
                <DocTypeIcon size={26} />
                <h1 className="doc-presentation-title">{doc.label}</h1>
              </div>
              <DocMetaRow creator={doc.creator} created_at={doc.created_at} updated_at={doc.updated_at} className="mt-4 mb-10" />
              <DocEditorSurface />
            </main>
          </div>
        </DocEditorProvider>
      </div>
    </ToastProvider>
  );
};

export default SharedDocPage;
