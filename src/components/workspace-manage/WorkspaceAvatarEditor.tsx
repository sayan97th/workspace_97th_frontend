"use client";
import React, { useEffect, useRef, useState } from "react";
import ActionMenu from "@/components/ui/dropdown/ActionMenu";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { workspace_avatar_max_size_bytes } from "@/data/workspace-create-data";
import { CameraIcon, DeleteIcon, UploadIcon } from "@/icons/workspace-icons";
import { apiErrorMessage } from "@/services/profile-preferences.service";

/** Mirrors the API's `StoreWorkspaceAvatarRequest` rules. */
const ACCEPTED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

const TILE_CLASS_NAME =
  "flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-[14px] border-4 border-shell-bg bg-brand-500 shadow-[0_4px_12px_rgba(0,0,0,0.16)] sm:h-[108px] sm:w-[108px] sm:rounded-[16px]";

const getAvatarFileError = (file: File): string | null => {
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) return "Please choose a PNG, JPG or WebP image.";
  if (file.size > workspace_avatar_max_size_bytes) return "The image must be 5MB or smaller.";
  return null;
};

export type WorkspaceAvatarEditorProps = {
  avatar_url?: string | null;
  mono: string;
  color?: string | null;
  workspace_name: string;
  /** Owners and admins can change the photo, everyone else just sees it. */
  can_manage: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
};

/**
 * The workspace photo on Manage Workspace. For people who can manage it, hovering
 * or focusing shows a "Change photo" overlay, a click uploads or opens the
 * replace and remove menu, and an image can also be dropped on it.
 */
const WorkspaceAvatarEditor: React.FC<WorkspaceAvatarEditorProps> = ({
  avatar_url,
  mono,
  color,
  workspace_name,
  can_manage,
  onUpload,
  onRemove,
}) => {
  const toast = useToast();
  const [preview_url, setPreviewUrl] = useState<string | null>(null);
  const [is_uploading, setIsUploading] = useState(false);
  const [is_dragging, setIsDragging] = useState(false);
  const [is_menu_open, setIsMenuOpen] = useState(false);
  const [is_remove_open, setIsRemoveOpen] = useState(false);
  const button_ref = useRef<HTMLButtonElement>(null);
  const file_input_ref = useRef<HTMLInputElement>(null);

  // The local preview stays until the saved image has loaded, so the photo never blinks.
  useEffect(() => {
    if (!avatar_url) return;
    let is_stale = false;
    const clearPreview = () => {
      if (!is_stale) setPreviewUrl(null);
    };
    const saved_image = new Image();
    saved_image.onload = clearPreview;
    saved_image.onerror = clearPreview;
    saved_image.src = avatar_url;
    return () => {
      is_stale = true;
    };
  }, [avatar_url]);

  useEffect(() => {
    if (!preview_url) return;
    return () => URL.revokeObjectURL(preview_url);
  }, [preview_url]);

  const displayed_url = preview_url ?? avatar_url;

  const tile_style: React.CSSProperties | undefined = displayed_url
    ? { backgroundColor: "var(--color-shell-bg)" }
    : color
      ? { backgroundColor: color }
      : undefined;

  const tile_content = displayed_url ? (
    // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary user uploaded URLs, not static app assets.
    <img src={displayed_url} alt="" draggable={false} className="h-full w-full object-cover" />
  ) : (
    <span className="font-heading text-[34px] font-semibold tracking-[-0.03em] text-white sm:text-[48px]">{mono}</span>
  );

  if (!can_manage) {
    return (
      <div className={TILE_CLASS_NAME} style={tile_style}>
        {tile_content}
      </div>
    );
  }

  const uploadFile = async (file: File) => {
    const file_error = getAvatarFileError(file);
    if (file_error) {
      toast.error(file_error);
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setIsUploading(true);
    try {
      await onUpload(file);
      toast.success("Workspace photo updated");
    } catch (error) {
      setPreviewUrl(null);
      toast.error(apiErrorMessage(error, "We couldn't upload this photo. Please try again."));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    await onRemove();
    toast.success("Workspace photo removed");
  };

  const overlay_label = is_dragging ? "Drop to upload" : displayed_url ? "Change photo" : "Upload photo";
  const is_overlay_forced = is_dragging || is_menu_open;

  return (
    <>
      <button
        ref={button_ref}
        type="button"
        disabled={is_uploading}
        aria-busy={is_uploading}
        aria-haspopup={avatar_url ? "menu" : undefined}
        aria-expanded={avatar_url ? is_menu_open : undefined}
        aria-label={`${overlay_label} for ${workspace_name}`}
        onClick={() => (avatar_url ? setIsMenuOpen((open) => !open) : file_input_ref.current?.click())}
        onDragOver={(event) => {
          event.preventDefault();
          if (!is_uploading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file && !is_uploading) void uploadFile(file);
        }}
        className={`group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0073ea] focus-visible:ring-offset-2 focus-visible:ring-offset-shell-bg disabled:cursor-wait ${TILE_CLASS_NAME}`}
        style={tile_style}
      >
        {tile_content}

        {is_uploading ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/55">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/35 border-t-white" />
          </span>
        ) : (
          <>
            <span
              className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 px-1 text-center text-white backdrop-blur-[2px] transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 ${
                is_overlay_forced ? "opacity-100" : "opacity-0"
              }`}
            >
              {is_dragging ? <UploadIcon size={20} /> : <CameraIcon size={20} />}
              <span className="text-[11px] font-semibold leading-[14px] sm:text-[12px]">{overlay_label}</span>
            </span>
            {/* Touch screens have no hover, this chip shows the photo can be changed. */}
            <span className="absolute bottom-1 left-1 hidden h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white [@media(hover:none)]:flex">
              <CameraIcon size={13} />
            </span>
          </>
        )}
      </button>

      <input
        ref={file_input_ref}
        type="file"
        accept={ACCEPTED_AVATAR_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void uploadFile(file);
        }}
      />

      <ActionMenu
        anchor_el={button_ref.current}
        is_open={is_menu_open}
        onClose={() => setIsMenuOpen(false)}
        aria_label="Workspace photo options"
        width={200}
        sections={[
          {
            key: "photo",
            items: [
              {
                key: "upload",
                label: "Upload new photo",
                icon: <UploadIcon size={16} />,
                onClick: () => file_input_ref.current?.click(),
              },
              {
                key: "remove",
                label: "Remove photo",
                icon: <DeleteIcon size={16} />,
                danger: true,
                onClick: () => setIsRemoveOpen(true),
              },
            ],
          },
        ]}
      />

      <ConfirmActionModal
        is_open={is_remove_open}
        title="Remove workspace photo?"
        description={`${workspace_name} will show its initials and color instead, for everyone in the workspace.`}
        confirm_label="Remove photo"
        variant="danger"
        onConfirm={handleRemove}
        onClose={() => setIsRemoveOpen(false)}
      />
    </>
  );
};

export default WorkspaceAvatarEditor;
