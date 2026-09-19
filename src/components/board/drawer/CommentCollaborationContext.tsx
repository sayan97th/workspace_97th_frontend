"use client";
import React, { createContext, useContext } from "react";
import type { CommentCollaborationApi } from "./types";

const CommentCollaborationContext = createContext<CommentCollaborationApi | null>(null);

export type CommentCollaborationProviderProps = {
  value: CommentCollaborationApi;
  /** False for a client-side-only mock board, where copy link, bookmarks and the other extras would have nothing to point at. Defaults to true. */
  enabled?: boolean;
  children: React.ReactNode;
};

/**
 * Hands a drawer's bookmark, copy link, quote and deep link highlight state to
 * the comment threads below it, so the extra actions do not have to be threaded
 * through every intermediate component as props. A thread rendered outside a
 * provider (the Kanban drawer's compact list) simply has none of them.
 */
export const CommentCollaborationProvider: React.FC<CommentCollaborationProviderProps> = ({ value, enabled = true, children }) =>
  enabled ? <CommentCollaborationContext.Provider value={value}>{children}</CommentCollaborationContext.Provider> : <>{children}</>;

/** The surrounding drawer's collaboration state, or null outside one. */
export const useCommentCollaborationContext = (): CommentCollaborationApi | null => useContext(CommentCollaborationContext);
