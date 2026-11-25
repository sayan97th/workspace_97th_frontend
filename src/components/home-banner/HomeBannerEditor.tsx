"use client";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Crop, Grid3x3, ImagePlus, Monitor, RefreshCw, Smartphone, Tablet, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { homeBannerService } from "@/services/home-banner.service";
import type { HomeHeroGreetingProps } from "@/components/home/HomeHero";
import type { HomeBannerDto, HomeBannerFraming, HomeBannerScope, HomeBannerState } from "@/types/home-banner";
import BannerFrame, { BANNER_DEVICES, type BannerDeviceId, type BannerPreviewImage } from "./BannerFrame";
import BannerControls from "./BannerControls";
import BannerCropper from "./BannerCropper";
import BannerDropZone from "./BannerDropZone";
import BannerRemoveConfirm from "./BannerRemoveConfirm";
import { DEFAULT_BANNER_FRAMING, framingOf, isSameFraming, resolveTextTone } from "./bannerFraming";
import {
  BANNER_ACCEPT_ATTRIBUTE,
  BannerImageError,
  formatFileSize,
  prepareBannerImage,
  releasePreparedImage,
  type PreparedBannerImage,
} from "./prepareBannerImage";
import "@/components/home/home.css";
import "./home-banner.css";

type DraftImage = { kind: "saved"; banner: HomeBannerDto } | { kind: "new"; prepared: PreparedBannerImage };

type BannerDraft = { image: DraftImage | null; framing: HomeBannerFraming };

const draftFromSaved = (banner: HomeBannerDto | null): BannerDraft => ({
  image: banner ? { kind: "saved", banner } : null,
  framing: banner ? framingOf(banner) : DEFAULT_BANNER_FRAMING,
});

const previewImageOf = (image: DraftImage): BannerPreviewImage =>
  image.kind === "saved"
    ? {
        image_url: image.banner.image_url,
        image_small_url: image.banner.image_small_url,
        placeholder: image.banner.placeholder,
        dominant_color: image.banner.dominant_color,
        width: image.banner.width,
        height: image.banner.height,
        luminance: image.banner.luminance,
      }
    : {
        image_url: image.prepared.preview_url,
        dominant_color: image.prepared.dominant_color,
        width: image.prepared.width,
        height: image.prepared.height,
        luminance: image.prepared.luminance,
      };

const DEVICE_ICONS: Record<BannerDeviceId, React.ElementType> = { desktop: Monitor, tablet: Tablet, phone: Smartphone };

/** Tallest the preview may get on screen, keeps the phone frame from towering over the dialog. */
const PREVIEW_MAX_HEIGHT = 260;

/** Crop mode shows the whole image, so it gets a little more height. */
const CROPPER_MAX_HEIGHT = 320;

export type HomeBannerEditorProps = {
  onClose: () => void;
  /** Home edits the person's own banner, Administration > Organization edits everyone's. */
  scope: HomeBannerScope;
  state: HomeBannerState;
  onSaved: (state: HomeBannerState) => void;
  /** What the greeting in the preview says. */
  greeting: HomeHeroGreetingProps;
  company_name: string;
};

/**
 * Upload a picture (dropped, pasted or picked), drag and zoom it into place, pick the text color
 * and the gradient, and check it on desktop, tablet and phone before saving.
 *
 * Mount it only while open, its draft starts from `state` every time.
 */
const HomeBannerEditor: React.FC<HomeBannerEditorProps> = ({ onClose, scope, state, onSaved, greeting, company_name }) => {
  const toast = useToast();
  const title_id = useId();
  const dialog_ref = useRef<HTMLDivElement>(null);
  const file_input_ref = useRef<HTMLInputElement>(null);
  const saved_banner = scope === "organization" ? state.organization : state.personal;
  // What Home shows once this banner is gone: a person falls back to the organization banner, the organization to the default design.
  const fallback_banner = scope === "personal" ? state.organization : null;
  const [draft, setDraft] = useState<BannerDraft>(() => draftFromSaved(saved_banner));
  const [active_device, setActiveDevice] = useState<BannerDeviceId>("desktop");
  const [stage_width, setStageWidth] = useState(640);
  const [show_guides, setShowGuides] = useState(false);
  const [is_cropping, setIsCropping] = useState(false);
  const [is_drag_over, setIsDragOver] = useState(false);
  const [is_processing, setIsProcessing] = useState(false);
  const [is_saving, setIsSaving] = useState(false);
  const [is_removing, setIsRemoving] = useState(false);
  const [upload_progress, setUploadProgress] = useState<number | null>(null);
  const [is_confirming_remove, setIsConfirmingRemove] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);

  const preview_image = draft.image ? previewImageOf(draft.image) : null;
  const resolved_tone = resolveTextTone(
    draft.framing.text_tone,
    preview_image?.luminance ?? 0.3,
    draft.framing.overlay_opacity,
    draft.framing.overlay_color
  );
  const is_new_image = draft.image?.kind === "new";
  const is_dirty = is_new_image || Boolean(saved_banner && draft.image && !isSameFraming(draft.framing, framingOf(saved_banner)));
  const is_busy = is_saving || is_processing;

  // A picked but unsaved image is freed when the dialog closes.
  const draft_ref = useRef(draft);
  useEffect(() => {
    draft_ref.current = draft;
  }, [draft]);
  useEffect(
    () => () => {
      if (draft_ref.current.image?.kind === "new") releasePreparedImage(draft_ref.current.image.prepared);
    },
    []
  );

  // The preview fills the stage, whatever the dialog width. A callback ref, the stage only mounts once there is an image.
  const stage_observer_ref = useRef<ResizeObserver | null>(null);
  const attachStage = useCallback((stage: HTMLDivElement | null) => {
    stage_observer_ref.current?.disconnect();
    stage_observer_ref.current = null;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => setStageWidth(Math.max(200, Math.floor(entry.contentRect.width))));
    observer.observe(stage);
    stage_observer_ref.current = observer;
  }, []);

  // Focus moves into the dialog and back to the button that opened it afterwards.
  useEffect(() => {
    const previous_focus = document.activeElement as HTMLElement | null;
    dialog_ref.current?.focus();
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous_overflow;
      previous_focus?.focus?.();
    };
  }, []);

  const updateFraming = useCallback(
    (framing: Partial<HomeBannerFraming>) => setDraft((current) => ({ ...current, framing: { ...current.framing, ...framing } })),
    []
  );

  const handleFile = useCallback(async (file: File) => {
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const prepared = await prepareBannerImage(file);
      setDraft((current) => {
        if (current.image?.kind === "new") releasePreparedImage(current.image.prepared);
        // A new image keeps the chosen text and gradient, only the position starts over.
        return { image: { kind: "new", prepared }, framing: { ...current.framing, focal_x: 50, focal_y: 50, zoom: 1 } };
      });
      setIsConfirmingRemove(false);
    } catch (error) {
      setErrorMessage(error instanceof BannerImageError ? error.message : "This image could not be opened. Try a JPG or PNG.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const requestClose = useCallback(() => {
    if (!is_saving) onClose();
  }, [is_saving, onClose]);

  // Escape closes, Ctrl or Cmd + V pastes a copied image.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        // Esc backs out of the removal confirmation first, a second Esc closes the editor.
        if (is_confirming_remove) {
          if (!is_removing) setIsConfirmingRemove(false);
          return;
        }
        requestClose();
      }
    };
    const handlePaste = (event: ClipboardEvent) => {
      const image_file = Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith("image/"));
      if (image_file && !is_busy && !is_confirming_remove) {
        event.preventDefault();
        void handleFile(image_file);
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("paste", handlePaste);
    };
  }, [requestClose, handleFile, is_busy, is_confirming_remove, is_removing]);

  const finishWrite = (next_state: HomeBannerState) => {
    onSaved(next_state);
    setDraft((current) => {
      if (current.image?.kind === "new") releasePreparedImage(current.image.prepared);
      return draftFromSaved(scope === "organization" ? next_state.organization : next_state.personal);
    });
  };

  const save = async () => {
    if (!draft.image || !is_dirty || is_busy) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const next_state =
        draft.image.kind === "new"
          ? await homeBannerService.uploadBanner(
              scope,
              draft.image.prepared.file,
              draft.framing,
              { name: draft.image.prepared.original_name, size: draft.image.prepared.original_size },
              (progress) => setUploadProgress(progress.total > 0 ? progress.loaded / progress.total : null)
            )
          : await homeBannerService.updateFraming(scope, draft.framing);
      finishWrite(next_state);
      toast.success("Banner saved");
      onClose();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, "Could not save. Try again."));
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  /** An image picked but not saved yet goes away at once, the saved banner (or the empty state) comes back. */
  const discardNewImage = () => {
    setDraft((current) => {
      if (current.image?.kind === "new") releasePreparedImage(current.image.prepared);
      return draftFromSaved(saved_banner);
    });
    setErrorMessage(null);
  };

  const remove = async () => {
    setIsSaving(true);
    setIsRemoving(true);
    setErrorMessage(null);
    try {
      finishWrite(await homeBannerService.removeBanner(scope));
      setIsConfirmingRemove(false);
      toast.success("Banner removed", {
        description: fallback_banner ? `Showing the ${company_name} banner again.` : "Showing the default design again.",
      });
    } catch (error) {
      setIsConfirmingRemove(false);
      setErrorMessage(apiErrorMessage(error, "Could not remove. Try again."));
    } finally {
      setIsSaving(false);
      setIsRemoving(false);
    }
  };

  const title = scope === "organization" ? "Organization banner" : "Your Home banner";
  const subtitle = scope === "organization" ? `Shown to everyone at ${company_name}.` : "Only you see it.";
  const empty_hint = scope === "personal" && state.organization ? `You currently see the ${company_name} banner.` : undefined;

  const file_summary = (() => {
    if (!draft.image) return null;
    if (draft.image.kind === "new") {
      const { prepared } = draft.image;
      return { name: prepared.original_name, size: formatFileSize(prepared.prepared_size), note: prepared.notes[0] ?? null };
    }
    const { banner } = draft.image;
    return { name: banner.original_name ?? "Banner", size: formatFileSize(banner.stored_size), note: null };
  })();

  const save_label = is_saving
    ? upload_progress !== null && upload_progress < 1
      ? `Uploading ${Math.round(upload_progress * 100)}%`
      : "Saving..."
    : "Save";

  return createPortal(
    <div className="home-banner-theme hb-overlay">
      <div className="hb-backdrop" onClick={requestClose} aria-hidden="true" />
      <div ref={dialog_ref} role="dialog" aria-modal="true" aria-labelledby={title_id} tabIndex={-1} className="hb-dialog">
        <header className="hb-header">
          <span className="hb-header-icon" aria-hidden="true">
            <ImagePlus className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={title_id} className="hb-title font-heading">
              {title}
            </h2>
            <p className="hb-subtitle">{subtitle}</p>
          </div>
          <button type="button" onClick={requestClose} disabled={is_saving} aria-label="Close" className="hb-close">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="hb-body" data-empty={!preview_image || undefined}>
          {preview_image ? (
            <>
              <div className="hb-main">
                <div
                  ref={attachStage}
                  className="hb-stage"
                  data-drag-over={is_drag_over || undefined}
                  onDragOver={(event) => {
                    if (!event.dataTransfer.types.includes("Files")) return;
                    event.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragOver(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragOver(false);
                    const file = event.dataTransfer.files?.[0];
                    if (file && !is_busy) void handleFile(file);
                  }}
                >
                  {is_cropping ? (
                    <BannerCropper
                      device={active_device}
                      image={preview_image}
                      framing={draft.framing}
                      max_width={stage_width}
                      max_height={CROPPER_MAX_HEIGHT}
                      onFramingChange={updateFraming}
                    />
                  ) : (
                    <BannerFrame
                      key={active_device}
                      device={active_device}
                      image={preview_image}
                      framing={draft.framing}
                      greeting={greeting}
                      max_width={stage_width}
                      max_height={PREVIEW_MAX_HEIGHT}
                      show_guides={show_guides}
                      onFramingChange={updateFraming}
                    />
                  )}
                  {is_drag_over || is_processing ? (
                    <div className="hb-stage-drop" aria-hidden="true">
                      {is_processing ? "Optimizing..." : "Drop to replace"}
                    </div>
                  ) : null}
                </div>

                <div className="hb-toolbar">
                  <div className="hb-devices" role="tablist" aria-label="Preview size">
                    {BANNER_DEVICES.map((device) => {
                      const Icon = DEVICE_ICONS[device.id];
                      return (
                        <button
                          key={device.id}
                          type="button"
                          role="tab"
                          aria-selected={active_device === device.id}
                          className="hb-device"
                          onClick={() => setActiveDevice(device.id)}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                          <span className="hb-device-label">{device.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="hb-toolbar-actions">
                    <button
                      type="button"
                      className="hb-tool-button"
                      aria-pressed={is_cropping}
                      onClick={() => setIsCropping((current) => !current)}
                      title={is_cropping ? "Back to preview" : "Crop and move the image"}
                    >
                      <Crop className="h-4 w-4" aria-hidden="true" />
                      <span>{is_cropping ? "Done" : "Crop"}</span>
                    </button>
                    {is_cropping ? null : (
                      <button
                        type="button"
                        className="hb-tool-button"
                        aria-pressed={show_guides}
                        onClick={() => setShowGuides((current) => !current)}
                        title="Show guides"
                        aria-label="Show guides"
                      >
                        <Grid3x3 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="hb-tool-button"
                      onClick={() => file_input_ref.current?.click()}
                      disabled={is_busy}
                      title="Replace image"
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      <span>Replace</span>
                    </button>
                    {is_new_image || saved_banner ? (
                      <button
                        type="button"
                        className="hb-tool-button"
                        data-variant="danger"
                        onClick={() => (is_new_image ? discardNewImage() : setIsConfirmingRemove(true))}
                        disabled={is_busy}
                        title={is_new_image ? "Discard this image" : "Remove banner"}
                        aria-label={is_new_image ? "Discard this image" : "Remove banner"}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </div>
                {file_summary ? (
                  <p className="hb-file">
                    <span className="hb-file-name" title={file_summary.name}>
                      {file_summary.name}
                    </span>
                    <span className="hb-file-size">{file_summary.size}</span>
                    {is_new_image ? <span className="hb-badge">Unsaved</span> : null}
                  </p>
                ) : null}
                {file_summary?.note ? <p className="hb-note">{file_summary.note}</p> : null}
              </div>

              <aside className="hb-panel">
                <fieldset disabled={is_saving} className="contents">
                  <legend className="sr-only">Banner style</legend>
                  <BannerControls
                    framing={draft.framing}
                    resolved_tone={resolved_tone}
                    onChange={updateFraming}
                    onReset={() => updateFraming(DEFAULT_BANNER_FRAMING)}
                  />
                </fieldset>
              </aside>
            </>
          ) : (
            <BannerDropZone
              is_processing={is_processing}
              onBrowse={() => file_input_ref.current?.click()}
              onFile={(file) => void handleFile(file)}
              hint={empty_hint}
            />
          )}

          {error_message ? (
            <p className="hb-error" role="alert">
              {error_message}
            </p>
          ) : null}

          <input
            ref={file_input_ref}
            type="file"
            accept={BANNER_ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
        </div>

        <footer className="hb-footer">
          <div className="flex-1" />
          <button type="button" className="hb-button" data-variant="secondary" onClick={requestClose} disabled={is_saving}>
            Cancel
          </button>
          <button
            type="button"
            className="hb-button hb-save"
            data-variant="primary"
            onClick={() => void save()}
            disabled={!is_dirty || is_busy}
            style={upload_progress !== null ? ({ "--upload-progress": `${upload_progress * 100}%` } as React.CSSProperties) : undefined}
          >
            {save_label}
          </button>
        </footer>

        {is_confirming_remove && saved_banner ? (
          <BannerRemoveConfirm
            current={{ image: previewImageOf({ kind: "saved", banner: saved_banner }), framing: framingOf(saved_banner) }}
            fallback={fallback_banner}
            fallback_label={fallback_banner ? company_name : "Default"}
            title={scope === "organization" ? "Remove it for everyone?" : "Remove your banner?"}
            is_removing={is_removing}
            onCancel={() => setIsConfirmingRemove(false)}
            onConfirm={() => void remove()}
          />
        ) : null}
      </div>
    </div>,
    document.body
  );
};

export default HomeBannerEditor;
