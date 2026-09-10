"use client";
import React, { useEffect, useRef, useState } from "react";
import { CameraIcon, CloseIcon } from "@/icons/workspace-icons";
import {
  default_new_workspace_name,
  hashWorkspaceColor,
  workspace_avatar_max_size_bytes,
  workspace_create_accent_color,
  type WorkspacePrivacy,
} from "@/data/workspace-create-data";
import WorkspacePrivacyPicker from "@/components/workspace-nav/WorkspacePrivacyPicker";
import WorkspaceColorPicker from "@/components/workspace-nav/WorkspaceColorPicker";

/** Everything the "Add new workspace" dialog collects, handed to the caller to actually create it. */
export type CreateWorkspaceSubmission = {
  name: string;
  privacy: WorkspacePrivacy;
  color: string;
  /** The workspace's custom avatar image, or null to keep its generated mono/color badge. */
  avatar_file: File | null;
};

type CreateWorkspaceModalProps = {
  is_open: boolean;
  onClose: () => void;
  /** Creates the workspace (and uploads its avatar, if one was chosen). May reject on failure. */
  onCreate: (submission: CreateWorkspaceSubmission) => Promise<void>;
};

/**
 * "Add new workspace" dialog reachable from the sidebar workspace switcher
 * (the `+` button and its "Add workspace" footer link) and from the
 * "Create workspace" rail button in {@link BrowseWorkspacesModal}. The badge
 * preview color/initial are derived live from the typed name until the user
 * overrides them with an explicit color pick and/or an uploaded photo, so the
 * preview always matches what the created workspace's badge will look like
 * everywhere else.
 */
const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  is_open,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState(default_new_workspace_name);
  const [privacy, setPrivacy] = useState<WorkspacePrivacy>("open");
  const [selected_color, setSelectedColor] = useState<string | null>(null);
  const [avatar_file, setAvatarFile] = useState<File | null>(null);
  const [avatar_preview_url, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatar_error, setAvatarError] = useState<string | null>(null);
  const [is_dragging_avatar, setIsDraggingAvatar] = useState(false);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);
  const avatar_input_ref = useRef<HTMLInputElement>(null);

  // Reset the form every time the modal is (re)opened.
  useEffect(() => {
    if (is_open) {
      setName(default_new_workspace_name);
      setPrivacy("open");
      setSelectedColor(null);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setAvatarError(null);
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [is_open]);

  // The preview <img> is backed by an object URL for the locally-picked file
  // (the workspace doesn't exist server-side yet to upload to) — release it
  // whenever it's replaced or the dialog closes, so it doesn't leak.
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

  if (!is_open) return null;

  const trimmed_name = name.trim();
  const can_submit = trimmed_name.length > 0 && !is_submitting;
  const preview_color = selected_color ?? hashWorkspaceColor(name);
  const preview_initial = trimmed_name[0]?.toUpperCase() ?? "W";

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
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    setAvatarError(null);
  };

  const handleSubmit = async () => {
    if (!can_submit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onCreate({
        name: trimmed_name,
        privacy,
        color: preview_color,
        avatar_file,
      });
      onClose();
    } catch {
      setSubmitError("We couldn't create this workspace. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add new workspace"
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
            Add new workspace
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
            aria-label={avatar_preview_url ? "Change workspace photo" : "Upload workspace photo"}
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
            {avatar_preview_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar_preview_url} alt="" className="h-full w-full object-cover" />
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
              {avatar_preview_url ? "Change photo" : "Upload photo"}
            </button>
            {avatar_preview_url && (
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
            placeholder={default_new_workspace_name}
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
            {is_submitting ? "Adding…" : "Add workspace"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkspaceModal;
