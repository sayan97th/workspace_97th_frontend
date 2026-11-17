"use client";
import { useMemo, useState } from "react";
import { createDraftAttachment, releaseDraftAttachment } from "./drawerAttachments";
import type { DrawerAttachment } from "./types";

type EditAttachmentDraft = { attachment: DrawerAttachment; file: File };

export type CommentEditAttachments = {
  /** Files shown under the edit box: the ones the update keeps, then the ones just added. */
  attachments: DrawerAttachment[];
  /** Files added while editing, uploaded on Save. */
  new_files: File[];
  /** Server ids of the update's own attachments the author took off, removed on Save. */
  removed_attachment_ids: number[];
  /** True once a file was added or taken off since {@link CommentEditAttachments.start}. */
  has_changes: boolean;
  /** Seeds the draft with the attachments the update has right now. */
  start: (existing: DrawerAttachment[]) => void;
  add: (files: File[]) => void;
  remove: (attachment_id: string) => void;
  reset: () => void;
};

/** Long enough for an edited update's upload to finish and swap the previews for the uploaded files. */
const DRAFT_PREVIEW_RELEASE_DELAY_MS = 120_000;

const createDraftId = () => `draft-${Math.random().toString(36).slice(2, 10)}`;

/**
 * The files of an update while its author edits it, shared by
 * `useBoardItemDrawer` and `useBoardDiscussionDrawer`. Nothing reaches the
 * server until Save, so Cancel simply drops the draft: added files are never
 * uploaded and removed ones stay on the update.
 */
export function useCommentEditAttachments(): CommentEditAttachments {
  const [original_attachments, setOriginalAttachments] = useState<DrawerAttachment[]>([]);
  const [kept_attachments, setKeptAttachments] = useState<DrawerAttachment[]>([]);
  const [drafts, setDrafts] = useState<EditAttachmentDraft[]>([]);

  return useMemo(() => {
    const kept_ids = new Set(kept_attachments.map((attachment) => attachment.id));
    const removed_attachment_ids = original_attachments
      .filter((attachment) => !kept_ids.has(attachment.id))
      .map((attachment) => Number(attachment.id))
      .filter((attachment_id) => Number.isFinite(attachment_id));

    return {
      attachments: [...kept_attachments, ...drafts.map((draft) => draft.attachment)],
      new_files: drafts.map((draft) => draft.file),
      removed_attachment_ids,
      has_changes: drafts.length > 0 || kept_attachments.length !== original_attachments.length,
      start: (existing) => {
        setOriginalAttachments(existing);
        setKeptAttachments(existing);
        setDrafts([]);
      },
      add: (files) => {
        if (files.length === 0) return;
        const additions = files.map((file) => ({ attachment: createDraftAttachment(createDraftId(), file), file }));
        setDrafts((current) => [...current, ...additions]);
      },
      remove: (attachment_id) => {
        setKeptAttachments((current) => current.filter((attachment) => attachment.id !== attachment_id));
        setDrafts((current) => {
          current.filter((draft) => draft.attachment.id === attachment_id).forEach((draft) => releaseDraftAttachment(draft.attachment));
          return current.filter((draft) => draft.attachment.id !== attachment_id);
        });
      },
      reset: () => {
        setOriginalAttachments([]);
        setKeptAttachments([]);
        setDrafts((current) => {
          // Save shows the edited update optimistically with these previews until the server answers, so they are freed a bit later.
          const released = current.map((draft) => draft.attachment);
          if (released.length > 0) window.setTimeout(() => released.forEach(releaseDraftAttachment), DRAFT_PREVIEW_RELEASE_DELAY_MS);
          return [];
        });
      },
    };
  }, [original_attachments, kept_attachments, drafts]);
}
