import { boardCommentsService } from "@/services/board-comments.service";
import { boardDiscussionService } from "@/services/board-discussion.service";
import type { RecordingRequest } from "@/components/recorder/ScreenRecorderProvider";
import type { ComposerDraftContextValue } from "../ComposerDraftContext";

/** Where a composer's recordings go: one key per item (or board discussion), so reopening the drawer picks the video up again. */
export function recordingTargetKey(draft_scope: ComposerDraftContextValue | null, fallback_id: string): string {
  if (!draft_scope) return `local:${fallback_id}`;
  return `board:${draft_scope.board_id}:${draft_scope.item_id ?? "discussion"}`;
}

/**
 * Builds the recorder request of an update composer. When the drawer was
 * closed before the recording finished, the video is posted as its own
 * update on the same item (or board discussion) instead of being lost.
 * Mock boards (no draft scope) have nowhere to post, the review then offers a download.
 */
export function buildRecordingRequest(draft_scope: ComposerDraftContextValue | null, target_key: string): RecordingRequest {
  if (!draft_scope) return { target_key };
  const { board_id, item_id } = draft_scope;

  return {
    target_key,
    postFallback: async (file, onProgress) => {
      const reportProgress = ({ loaded, total }: { loaded: number; total: number }) => onProgress(total > 0 ? Math.min(loaded / total, 1) : 0);
      if (item_id !== null) {
        await boardCommentsService.postComment(board_id, item_id, { body: "", attachments: [file] }, reportProgress);
        return;
      }
      await boardDiscussionService.postComment(board_id, { body: "", attachments: [file] }, reportProgress);
    },
  };
}
