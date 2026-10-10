"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import AnchoredMenu, { type AnchoredMenuItem } from "@/components/ui/dropdown/AnchoredMenu";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { DeleteIcon, ImageIcon, MoveVerticalIcon, UploadIcon } from "@/icons/workspace-icons";

/** Shown until a workspace uploads its own cover. */
export const DEFAULT_WORKSPACE_COVER_URL = "/images/workspace/default-cover.svg";

const ACCEPTED_COVER_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_COVER_BYTES = 10 * 1024 * 1024;
/** Must match `StoreWorkspaceCoverRequest`: anything smaller is upscaled across the banner and looks blurry. */
const MIN_COVER_WIDTH = 1000;
const MIN_COVER_HEIGHT = 200;

type ImageSize = { width: number; height: number };

const clampPosition = (value: number): number => Math.min(100, Math.max(0, value));

/** Reads an image file's pixel size without uploading it, so bad files are rejected right away. */
const readImageSize = (file: File): Promise<ImageSize> =>
  new Promise((resolve, reject) => {
    const object_url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(object_url);
    };
    image.onerror = () => {
      reject(new Error("unreadable"));
      URL.revokeObjectURL(object_url);
    };
    image.src = object_url;
  });

/** Returns a user facing reason the file can't be used as a cover, or null when it's fine. */
const validateCoverFile = async (file: File): Promise<string | null> => {
  if (!ACCEPTED_COVER_TYPES.includes(file.type)) return "Choose a PNG, JPG or WebP image.";
  if (file.size > MAX_COVER_BYTES) return "The cover image may not be larger than 10 MB.";
  try {
    const { width, height } = await readImageSize(file);
    if (width < MIN_COVER_WIDTH || height < MIN_COVER_HEIGHT) {
      return `The cover image must be at least ${MIN_COVER_WIDTH}px wide and ${MIN_COVER_HEIGHT}px tall.`;
    }
  } catch {
    return "We couldn't read that image.";
  }
  return null;
};

export type WorkspaceCoverProps = {
  /** Custom cover, or null to show {@link DEFAULT_WORKSPACE_COVER_URL}. */
  cover_url: string | null;
  /** Saved vertical focal point, 0 (top) to 100 (bottom). */
  cover_position_y: number;
  /** Owners and admins get the "Change cover" control; everyone else just sees the banner. */
  can_manage: boolean;
  onUpload: (file: File) => Promise<void>;
  onReposition: (cover_position_y: number) => Promise<void>;
  onRemove: () => Promise<void>;
};

/**
 * Manage Workspace's wide banner. The image always fills the banner
 * (`object-cover`) and is framed vertically by `cover_position_y`, which the
 * owner sets by dragging the image in "Reposition" mode, so any photo, not
 * just one cropped to the banner's exact ratio, looks right.
 */
const WorkspaceCover: React.FC<WorkspaceCoverProps> = ({
  cover_url,
  cover_position_y,
  can_manage,
  onUpload,
  onReposition,
  onRemove,
}) => {
  const toast = useToast();
  const container_ref = useRef<HTMLDivElement>(null);
  const menu_button_ref = useRef<HTMLButtonElement>(null);
  const file_input_ref = useRef<HTMLInputElement>(null);
  const drag_ref = useRef<{ start_y: number; start_position: number } | null>(null);

  const [is_menu_open, setIsMenuOpen] = useState(false);
  const [is_busy, setIsBusy] = useState(false);
  const [is_repositioning, setIsRepositioning] = useState(false);
  const [draft_position_y, setDraftPositionY] = useState(cover_position_y);
  const [natural_size, setNaturalSize] = useState<ImageSize | null>(null);
  // A fresh upload drops straight into reposition mode once its image has loaded.
  const [should_reposition_on_load, setShouldRepositionOnLoad] = useState(false);

  const has_custom_cover = Boolean(cover_url);
  const image_url = cover_url ?? DEFAULT_WORKSPACE_COVER_URL;
  const position_y = is_repositioning ? draft_position_y : cover_position_y;

  useEffect(() => {
    if (!is_repositioning) setDraftPositionY(cover_position_y);
  }, [cover_position_y, is_repositioning]);

  const cancelReposition = useCallback(() => {
    drag_ref.current = null;
    setIsRepositioning(false);
    setDraftPositionY(cover_position_y);
  }, [cover_position_y]);

  useEffect(() => {
    if (!is_repositioning) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelReposition();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_repositioning, cancelReposition]);

  const runAction = async (action: () => Promise<void>, fallback_message: string): Promise<boolean> => {
    setIsBusy(true);
    try {
      await action();
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error, fallback_message));
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires `change`.
    event.target.value = "";
    if (!file) return;

    const validation_error = await validateCoverFile(file);
    if (validation_error) {
      toast.error(validation_error);
      return;
    }

    const is_uploaded = await runAction(() => onUpload(file), "We couldn't upload the cover image.");
    if (is_uploaded) {
      toast.success("Cover updated", { description: "Drag the image to frame it, then save." });
      setShouldRepositionOnLoad(true);
    }
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
    if (should_reposition_on_load && has_custom_cover) {
      setShouldRepositionOnLoad(false);
      setDraftPositionY(cover_position_y);
      setIsRepositioning(true);
    }
  };

  const saveReposition = async () => {
    const is_saved = await runAction(
      () => onReposition(draft_position_y),
      "We couldn't save the cover position."
    );
    if (is_saved) setIsRepositioning(false);
  };

  const handleRemove = async () => {
    const is_removed = await runAction(onRemove, "We couldn't remove the cover image.");
    if (is_removed) toast.success("Cover removed");
  };

  /** How many pixels of the image are hidden above and below the banner. */
  const verticalOverflow = (): number => {
    const container = container_ref.current;
    if (!container || !natural_size) return 0;
    const rendered_height = Math.max(
      container.clientHeight,
      (container.clientWidth * natural_size.height) / natural_size.width
    );
    return rendered_height - container.clientHeight;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!is_repositioning || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag_ref.current = { start_y: event.clientY, start_position: draft_position_y };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = drag_ref.current;
    if (!drag) return;
    const overflow = verticalOverflow();
    if (overflow <= 0) return;
    // Dragging down reveals more of the top of the image, so the focal point moves up.
    const delta_percent = ((event.clientY - drag.start_y) / overflow) * 100;
    setDraftPositionY(clampPosition(drag.start_position - delta_percent));
  };

  const handlePointerUp = () => {
    drag_ref.current = null;
  };

  const menu_items: AnchoredMenuItem[] = [
    {
      key: "upload",
      label: has_custom_cover ? "Replace image" : "Upload image",
      icon: <UploadIcon />,
      onClick: () => file_input_ref.current?.click(),
    },
    ...(has_custom_cover
      ? ([
          {
            key: "reposition",
            label: "Reposition",
            icon: <MoveVerticalIcon />,
            onClick: () => {
              setDraftPositionY(cover_position_y);
              setIsRepositioning(true);
            },
          },
          {
            key: "remove",
            label: "Remove cover",
            icon: <DeleteIcon />,
            onClick: () => void handleRemove(),
            danger: true,
          },
        ] satisfies AnchoredMenuItem[])
      : []),
  ];

  return (
    <div
      ref={container_ref}
      className={`workspace-cover group relative h-[140px] w-full select-none overflow-hidden bg-[#e6e9ef] sm:h-[200px] ${
        is_repositioning ? "is-repositioning" : ""
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- covers come from arbitrary user uploaded URLs, not static app assets. */}
      <img
        src={image_url}
        alt=""
        draggable={false}
        onLoad={handleImageLoad}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: `50% ${position_y}%` }}
      />

      {is_repositioning && (
        <>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-[4px] bg-black/55 px-3 py-1.5 text-[13px] text-white">
              Drag the image to reposition
            </span>
          </div>
          <div className="absolute bottom-3 right-4 flex items-center gap-2" onPointerDown={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={cancelReposition}
              disabled={is_busy}
              className="h-8 rounded-[4px] bg-white px-3 text-[14px] text-[#323338] shadow-sm transition-colors hover:bg-[#f5f6f8] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveReposition()}
              disabled={is_busy}
              className="h-8 rounded-[4px] bg-[#0073ea] px-3 text-[14px] text-white shadow-sm transition-colors hover:bg-[#0060b9] disabled:opacity-60"
            >
              {is_busy ? "Saving..." : "Save position"}
            </button>
          </div>
        </>
      )}

      {can_manage && !is_repositioning && (
        <>
          <button
            ref={menu_button_ref}
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            disabled={is_busy}
            aria-haspopup="menu"
            aria-expanded={is_menu_open}
            className={`absolute bottom-3 right-4 flex h-8 items-center gap-1.5 rounded-[4px] bg-white/90 px-2.5 text-[14px] text-[#323338] shadow-sm backdrop-blur-sm transition-opacity hover:bg-white focus-visible:opacity-100 disabled:cursor-wait ${
              is_menu_open || is_busy ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {is_busy ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#c3c6d4] border-t-[#0073ea]" />
            ) : (
              <ImageIcon />
            )}
            {is_busy ? "Uploading..." : "Change cover"}
          </button>
          <AnchoredMenu
            anchor_el={menu_button_ref.current}
            is_open={is_menu_open}
            onClose={() => setIsMenuOpen(false)}
            items={menu_items}
            width={200}
            align="end"
          />
          <input
            ref={file_input_ref}
            type="file"
            accept={ACCEPTED_COVER_TYPES.join(",")}
            className="hidden"
            onChange={(event) => void handleFileChange(event)}
          />
        </>
      )}
    </div>
  );
};

export default WorkspaceCover;
