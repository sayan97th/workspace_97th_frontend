"use client";
import { createContext, useContext } from "react";

export type CommentAttachmentActions = {
  /** Only the author of an update may change its files, like editing it. */
  current_user_id: string;
  deleteAttachment: (comment_id: string, attachment_id: string) => Promise<void>;
  replaceAttachment: (comment_id: string, attachment_id: string, file: File, onProgress?: (progress: number) => void) => Promise<void>;
  /** Used when the file being deleted is the whole update (no text, no other file). */
  deleteComment: (comment_id: string) => void;
};

const CommentAttachmentActionsContext = createContext<CommentAttachmentActions | null>(null);

/** Provided by `UpdatesPanel` for a real, saved thread; absent elsewhere, where posted files are read only. */
export const CommentAttachmentActionsProvider = CommentAttachmentActionsContext.Provider;

export function useCommentAttachmentActions(): CommentAttachmentActions | null {
  return useContext(CommentAttachmentActionsContext);
}
