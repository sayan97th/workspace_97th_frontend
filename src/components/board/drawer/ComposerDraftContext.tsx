"use client";
import React, { createContext, useContext } from "react";
import type { DrawerComposerTarget } from "./types";

export type ComposerDraftContextValue = {
  board_id: number;
  /** The open item, or null for the board discussion. */
  item_id: number | null;
  /** Empties one composer and throws its draft away, with an Undo toast. */
  discardDraft: (target: DrawerComposerTarget) => void;
};

const ComposerDraftContext = createContext<ComposerDraftContextValue | null>(null);

export type ComposerDraftProviderProps = {
  value: ComposerDraftContextValue | null | undefined;
  children: React.ReactNode;
};

/**
 * Tells every composer of a drawer (the update box and each reply box) where
 * its draft is saved, so each one can show its own "Draft saved" status and
 * Discard button without threading props through the comment threads. A
 * composer outside a provider (a mock board, the doc comments) shows neither.
 */
export const ComposerDraftProvider: React.FC<ComposerDraftProviderProps> = ({ value, children }) => (
  <ComposerDraftContext.Provider value={value ?? null}>{children}</ComposerDraftContext.Provider>
);

/** The surrounding drawer's draft scope, or null when drafts are off. */
export const useComposerDraftContext = (): ComposerDraftContextValue | null => useContext(ComposerDraftContext);
