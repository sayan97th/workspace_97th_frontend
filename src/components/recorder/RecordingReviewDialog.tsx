"use client";
import React, { useEffect, useState } from "react";
import { Download, Paperclip, RotateCcw, Send, Trash2, X } from "lucide-react";
import MediaDialog from "@/components/media/MediaDialog";
import LazyVideoPlayer from "@/components/media/LazyVideoPlayer";
import { formatAttachmentSize } from "@/components/board/drawer/drawerAttachments";
import type { RecorderEngine } from "./useRecorderEngine";
import { formatRecordingTime, recordingExtension } from "./recorderUtils";

export type RecordingReviewDialogProps = {
  engine: RecorderEngine;
  /** True when the composer that asked for the video is still open, the video goes into its file tray. */
  can_attach: boolean;
  /** True when the video can be posted as its own update even though that composer is gone (the drawer was closed). */
  can_post: boolean;
  onAttach: (file: File) => void;
  onPost: (file: File, onProgress: (progress: number) => void) => Promise<void>;
};

/**
 * Last step of the recorder: watch the take, give it a title and add it to
 * the update (or post it right away when the drawer was closed meanwhile).
 * Like Loom, nothing is uploaded until the user decides, and it can't be
 * dismissed by accident: closing asks before throwing the video away.
 */
export default function RecordingReviewDialog({ engine, can_attach, can_post, onAttach, onPost }: RecordingReviewDialogProps) {
  const result = engine.result;
  const is_open = engine.phase === "processing" || engine.phase === "review";
  const [title, setTitle] = useState("");
  const [is_confirming_discard, setConfirmingDiscard] = useState(false);
  const [post_progress, setPostProgress] = useState<number | null>(null);
  const [post_error, setPostError] = useState<string | null>(null);
  const is_posting = post_progress !== null;

  // A new take starts with its default title.
  useEffect(() => {
    if (!result) return;
    setTitle(result.file.name.replace(/\.[^.]+$/, ""));
    setConfirmingDiscard(false);
    setPostError(null);
    setPostProgress(null);
  }, [result?.url]); // eslint-disable-line react-hooks/exhaustive-deps

  const finalFile = () => engine.renameResult(title)?.file ?? result?.file ?? null;

  const attach = () => {
    const file = finalFile();
    if (!file) return;
    onAttach(file);
    engine.cancel();
  };

  const post = async () => {
    const file = finalFile();
    if (!file) return;
    setPostError(null);
    setPostProgress(0);
    try {
      await onPost(file, setPostProgress);
      engine.cancel();
    } catch {
      setPostError("The video could not be posted. Check your connection and try again, or download it to keep a copy.");
      setPostProgress(null);
    }
  };

  const download = () => {
    const file = finalFile();
    if (!file) return;
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <MediaDialog is_open={is_open} onClose={() => setConfirmingDiscard(true)} aria_label="Review your recording" panel_class_name="screen-recorder-review" can_dismiss={!is_posting}>
      <header className="screen-recorder-review__header">
        <div className="min-w-0">
          <h2 className="screen-recorder-review__title">Review your recording</h2>
          <p className="screen-recorder-review__subtitle">Watch it back, give it a name and share it with your team.</p>
        </div>
        <button
          type="button"
          className="screen-recorder-setup__close"
          onClick={() => setConfirmingDiscard(true)}
          aria-label="Discard recording"
          disabled={is_posting || engine.phase === "processing"}
        >
          <X size={18} />
        </button>
      </header>

      <div className="screen-recorder-review__player">
        {result ? (
          <LazyVideoPlayer src={result.url} title={title || "Recording"} />
        ) : (
          <div className="screen-recorder-review__processing">
            <span className="screen-recorder-review__spinner" aria-hidden="true" />
            Preparing your video
          </div>
        )}
      </div>

      {result && (
        <>
          <div className="screen-recorder-review__fields">
            <label className="screen-recorder-review__label" htmlFor="screen-recorder-title">
              Title
            </label>
            <input
              id="screen-recorder-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              className="screen-recorder-review__input"
              disabled={is_posting}
            />
            <div className="screen-recorder-review__meta">
              <span>{formatRecordingTime(result.duration_ms)}</span>
              <span aria-hidden="true">·</span>
              <span>{formatAttachmentSize(result.file.size)}</span>
              <span aria-hidden="true">·</span>
              <span>{recordingExtension(result.file.type).toUpperCase()}</span>
            </div>
          </div>

          {post_error && (
            <p className="screen-recorder-setup__error" role="alert">
              {post_error}
            </p>
          )}
          {!can_attach && !can_post && (
            <p className="screen-recorder-setup__tip">The update you were writing was closed. Download the video, then attach it to any update.</p>
          )}

          {is_posting && (
            <div className="screen-recorder-review__progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(post_progress * 100)}>
              <span style={{ width: `${Math.max(4, post_progress * 100)}%` }} />
              <em>Uploading {Math.round(post_progress * 100)}%</em>
            </div>
          )}

          <footer className="screen-recorder-review__footer">
            {is_confirming_discard ? (
              <div className="screen-recorder-review__confirm" role="alert">
                <span>Discard this recording? It has not been saved anywhere.</span>
                <button type="button" className="screen-recorder-review__ghost" onClick={() => setConfirmingDiscard(false)}>
                  Keep it
                </button>
                <button type="button" className="screen-recorder-review__danger" onClick={engine.cancel}>
                  Discard
                </button>
              </div>
            ) : (
              <>
                <div className="screen-recorder-review__secondary">
                  <button type="button" className="screen-recorder-review__ghost" onClick={() => setConfirmingDiscard(true)} disabled={is_posting}>
                    <Trash2 size={15} />
                    Delete
                  </button>
                  <button type="button" className="screen-recorder-review__ghost" onClick={engine.recordAgain} disabled={is_posting}>
                    <RotateCcw size={15} />
                    Record again
                  </button>
                  <button type="button" className="screen-recorder-review__ghost" onClick={download} disabled={is_posting}>
                    <Download size={15} />
                    Download
                  </button>
                </div>
                {can_attach ? (
                  <button type="button" className="screen-recorder-review__primary" onClick={attach}>
                    <Paperclip size={15} />
                    Add to update
                  </button>
                ) : can_post ? (
                  <button type="button" className="screen-recorder-review__primary" onClick={() => void post()} disabled={is_posting}>
                    <Send size={15} />
                    {is_posting ? "Posting" : "Post as update"}
                  </button>
                ) : null}
              </>
            )}
          </footer>
        </>
      )}
    </MediaDialog>
  );
}
