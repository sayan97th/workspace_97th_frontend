"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CameraIcon, CloseIcon } from "@/icons/workspace-icons";
import {
  hashWorkspaceColor,
  workspace_avatar_max_size_bytes,
  workspace_create_accent_color,
  type WorkspacePrivacy,
} from "@/data/workspace-create-data";
import WorkspacePrivacyPicker from "@/components/workspace-nav/WorkspacePrivacyPicker";
import WorkspaceColorPicker from "@/components/workspace-nav/WorkspaceColorPicker";

/** Minimal workspace shape this dialog needs to prefill its fields — any workspace-ish object (switcher rows, browse cards, the active header workspace) satisfies it structurally. */
export type EditWorkspaceModalWorkspace = {
  id: string;
  name: string;
  color: string;
  avatar_url?: string | null;
  privacy?: WorkspacePrivacy;
};

/** Everything the "Edit workspace" dialog collects, handed to the caller to actually persist it. */
export type EditWorkspaceSubmission = {
  name: string;
  privacy: WorkspacePrivacy;
  color: string;
  /** A newly-picked avatar to upload, `"remove"` to drop the current one, or `null` to leave the avatar untouched. */
  avatar_change: File | "remove" | null;
};

type EditWorkspaceModalProps = {
  is_open: boolean;
  workspace: EditWorkspaceModalWorkspace | null;
  onClose: () => void;
  /** Persists the edited fields (and uploads/removes the avatar, if changed). May reject on failure. */
  onSave: (workspace_slug: string, submission: EditWorkspaceSubmission) => Promise<void>;
};

/**
 * "Edit workspace" dialog reachable from the "…" options menu on any workspace
 * row/card (sidebar switcher, browse grid, workspace header) — the sibling of
 * {@link CreateWorkspaceModal} that edits an existing workspace's name, badge
 * color, avatar, and privacy in one place instead of the separate
 * Rename/Change type dialogs.
 */
const EditWorkspaceModal: React.FC<EditWorkspaceModalProps> = ({
  is_open,
  workspace,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [privacy, setPrivacy] = useState<WorkspacePrivacy>("open");
  const [selected_color, setSelectedColor] = useState<string | null>(null);
  const [avatar_file, setAvatarFile] = useState<File | null>(null);
  const [avatar_preview_url, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatar_removed, setAvatarRemoved] = useState(false);
  const [avatar_error, setAvatarError] = useState<string | null>(null);
  const [is_dragging_avatar, setIsDraggingAvatar] = useState(false);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);
  const avatar_input_ref = useRef<HTMLInputElement>(null);

  // (Re)seed the form from the workspace being edited every time the modal opens.
  useEffect(() => {
    if (is_open && workspace) {
      setName(workspace.name);
      setPrivacy(workspace.privacy ?? "open");
      setSelectedColor(workspace.color);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setAvatarRemoved(false);
      setAvatarError(null);
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [is_open, workspace]);

  // The preview <img> is backed by an object URL for the locally-picked file —
  // release it whenever it's replaced or the dialog closes, so it doesn't leak.
  useEffect(() => {
    return () => {
      if (avatar_preview_url) URL.revokeObjectURL(avatar_preview_url);
    };
  }, [avatar_preview_url]);

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previous_overflow;
    };
  }, [is_open, onClose]);

  if (!is_open || !workspace || typeof document === "undefined") return null;

  const trimmed_name = name.trim();
  const can_submit = trimmed_name.length > 0 && !is_submitting;
  const preview_color = selected_color ?? hashWorkspaceColor(name);
  const preview_initial = trimmed_name[0]?.toUpperCase() ?? "W";
  const existing_avatar_url = workspace.avatar_url ?? null;
  // What the badge should render right now: a freshly-picked file, the workspace's
  // saved avatar (unless the user just removed it), or the mono/color fallback.
  const displayed_avatar_url = avatar_preview_url ?? (avatar_removed ? null : existing_avatar_url);

  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > workspace_avatar_max_size_bytes) {
      setAvatarError("Image must be 5MB or smaller.");
      return;
    }
    setAvatarError(null);
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setAvatarRemoved(false);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    setAvatarError(null);
    setAvatarRemoved(true);
  };

  const handleSubmit = async () => {
    if (!can_submit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const avatar_change: EditWorkspaceSubmission["avatar_change"] = avatar_file
        ? avatar_file
        : avatar_removed && existing_avatar_url
          ? "remove"
          : null;
      await onSave(workspace.id, {
        name: trimmed_name,
        privacy,
        color: preview_color,
        avatar_change,
      });
      onClose();
    } catch {
      setSubmitError("We couldn't save these changes. Please try again.");
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit workspace"
      className="fixed inset-0 z-[420] flex items-center justify-center p-6"
    >
      <div
        className="absolute inset-0 bg-[#060e0e]/[0.68]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-[421] w-[420px] max-w-full overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-5">
          <span className="text-lg font-extrabold tracking-[-0.01em]">
            Edit workspace
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-shell-hover hover:text-white"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {/* Avatar preview + upload */}
        <div className="flex flex-col items-center gap-2 px-[22px] pb-2 pt-[26px]">
          <div
            role="button"
            tabIndex={0}
            aria-label={displayed_avatar_url ? "Change workspace photo" : "Upload workspace photo"}
            onClick={() => !is_submitting && avatar_input_ref.current?.click()}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              if (!is_submitting) avatar_input_ref.current?.click();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingAvatar(true);
            }}
            onDragLeave={() => setIsDraggingAvatar(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDraggingAvatar(false);
              const file = event.dataTransfer.files?.[0];
              if (file) handleAvatarFile(file);
            }}
            className={`group relative flex h-[72px] w-[72px] flex-none cursor-pointer items-center justify-center overflow-hidden rounded-2xl text-[28px] font-extrabold text-white outline-none transition-colors duration-150 ${
              is_dragging_avatar ? "ring-2 ring-[#2B76E5] ring-offset-2 ring-offset-shell-panel" : ""
            }`}
            style={{ backgroundColor: preview_color }}
          >
            {displayed_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayed_avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              preview_initial
            )}
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity duration-150 group-hover:bg-black/45 group-hover:opacity-100">
              <CameraIcon size={20} className="text-white" />
            </span>
          </div>

          <input
            ref={avatar_input_ref}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleAvatarFile(file);
              event.target.value = "";
            }}
          />

          <div className="flex items-center gap-2.5 text-[12px] font-semibold">
            <button
              type="button"
              onClick={() => avatar_input_ref.current?.click()}
              className="text-[#2B76E5] hover:underline"
            >
              {displayed_avatar_url ? "Change photo" : "Upload photo"}
            </button>
            {displayed_avatar_url && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-gray-400 hover:text-gray-300 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
          {avatar_error && <div className="text-xs text-[#ff8a94]">{avatar_error}</div>}
        </div>

        {/* Workspace name */}
        <div className="px-[22px] pt-[22px]">
          <label className="mb-[7px] block text-[12.5px] font-semibold text-gray-400">
            Workspace name
          </label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Workspace name"
            autoFocus
            className="w-full rounded-[9px] border border-shell-border-strong bg-shell-panel px-[13px] py-[11px] text-sm text-shell-text outline-none focus:border-[#2B76E5]"
          />
        </div>

        {/* Color */}
        <div className="px-[22px] pt-5">
          <WorkspaceColorPicker value={preview_color} onChange={setSelectedColor} />
        </div>

        {/* Privacy */}
        <div className="px-[22px] pb-6 pt-5">
          <WorkspacePrivacyPicker value={privacy} onChange={setPrivacy} />
        </div>

        {submit_error && (
          <div className="mx-[22px] mb-4 rounded-[9px] border border-[#ff8a94]/30 bg-[#ff8a94]/10 px-3.5 py-2.5 text-[12.5px] font-medium text-[#ff8a94]">
            {submit_error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-shell-border px-[22px] py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold text-gray-300 transition-colors hover:bg-shell-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!can_submit}
            className="rounded-lg px-5 py-2.5 text-[13.5px] font-semibold transition-colors disabled:cursor-default"
            style={{
              backgroundColor: can_submit ? workspace_create_accent_color : "rgba(255,255,255,0.08)",
              color: can_submit ? "#fff" : "#6E7B7D",
            }}
          >
            {is_submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EditWorkspaceModal;
