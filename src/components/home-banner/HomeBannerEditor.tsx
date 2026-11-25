"use client";
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Eye, EyeOff, ImageUp, Sparkles, Trash2, User as UserIcon, X } from "lucide-react";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { homeBannerService } from "@/services/home-banner.service";
import type { HomeHeroGreetingProps } from "@/components/home/HomeHero";
import type { HomeBannerDto, HomeBannerFraming, HomeBannerScope, HomeBannerState } from "@/types/home-banner";
import BannerFrame, { BANNER_DEVICES, type BannerDeviceId, type BannerPreviewImage } from "./BannerFrame";
import BannerControls from "./BannerControls";
import BannerDropZone from "./BannerDropZone";
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

type ScopeDraft = { image: DraftImage | null; framing: HomeBannerFraming };

const draftFromSaved = (banner: HomeBannerDto | null): ScopeDraft => ({
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

/** Largest on screen height of the main preview, keeps the tall phone frame in check. */
const STAGE_MAX_HEIGHT = 300;

export type HomeBannerEditorProps = {
  onClose: () => void;
  /** Which banner opens first. */
  initial_scope: HomeBannerScope;
  state: HomeBannerState;
  onSaved: (state: HomeBannerState) => void;
  /** Admins on Home can switch between their own banner and the organization one. */
  allow_scope_switch: boolean;
  /** What the greeting in the previews says. */
  greeting: HomeHeroGreetingProps;
  company_name: string;
};

/**
 * "Customize Home banner": upload a picture (dropped, pasted or picked), choose the part that
 * shows by dragging and zooming, pick the greeting color and shade, and check it on desktop,
 * tablet and phone before saving. Used from Home (personal, plus organization for admins) and
 * from Administration > Organization.
 *
 * Mount it only while open, its drafts start from `state` every time.
 */
const HomeBannerEditor: React.FC<HomeBannerEditorProps> = ({
  onClose,
  initial_scope,
  state,
  onSaved,
  allow_scope_switch,
  greeting,
  company_name,
}) => {
  const toast = useToast();
  const title_id = useId();
  const dialog_ref = useRef<HTMLDivElement>(null);
  const file_input_ref = useRef<HTMLInputElement>(null);
  const stage_ref = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState<HomeBannerScope>(initial_scope);
  const [drafts, setDrafts] = useState<Record<HomeBannerScope, ScopeDraft>>(() => ({
    personal: draftFromSaved(state.personal),
    organization: draftFromSaved(state.organization),
  }));
  const [active_device, setActiveDevice] = useState<BannerDeviceId>("desktop");
  const [stage_width, setStageWidth] = useState(640);
  const [show_guides, setShowGuides] = useState(false);
  const [is_processing, setIsProcessing] = useState(false);
  const [is_saving, setIsSaving] = useState(false);
  const [upload_progress, setUploadProgress] = useState<number | null>(null);
  const [is_confirming_remove, setIsConfirmingRemove] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);

  const draft = drafts[scope];
  const saved_banner = scope === "organization" ? state.organization : state.personal;
  const preview_image = draft.image ? previewImageOf(draft.image) : null;
  const resolved_tone = resolveTextTone(draft.framing.text_tone, preview_image?.luminance ?? 0.3, draft.framing.overlay_opacity);
  const is_new_image = draft.image?.kind === "new";
  const is_dirty = is_new_image || Boolean(saved_banner && draft.image && !isSameFraming(draft.framing, framingOf(saved_banner)));
  const is_busy = is_saving || is_processing;

  // Object URLs of images picked but never saved are freed when the dialog closes.
  const drafts_ref = useRef(drafts);
  useEffect(() => {
    drafts_ref.current = drafts;
  }, [drafts]);
  useEffect(
    () => () => {
      Object.values(drafts_ref.current).forEach((scope_draft) => {
        if (scope_draft.image?.kind === "new") releasePreparedImage(scope_draft.image.prepared);
      });
    },
    []
  );

  // The main preview fills the stage column, whatever the dialog width.
  useEffect(() => {
    const stage = stage_ref.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => setStageWidth(Math.max(200, Math.floor(entry.contentRect.width))));
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // Focus moves into the dialog and back to the "Customize" button afterwards.
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

  const updateDraft = useCallback(
    (next: Partial<ScopeDraft>) => setDrafts((current) => ({ ...current, [scope]: { ...current[scope], ...next } })),
    [scope]
  );

  const updateFraming = useCallback(
    (framing: Partial<HomeBannerFraming>) =>
      setDrafts((current) => ({ ...current, [scope]: { ...current[scope], framing: { ...current[scope].framing, ...framing } } })),
    [scope]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);
      setIsProcessing(true);
      try {
        const prepared = await prepareBannerImage(file);
        setDrafts((current) => {
          const previous = current[scope].image;
          if (previous?.kind === "new") releasePreparedImage(previous.prepared);
          return { ...current, [scope]: { image: { kind: "new", prepared }, framing: DEFAULT_BANNER_FRAMING } };
        });
        setIsConfirmingRemove(false);
      } catch (error) {
        setErrorMessage(error instanceof BannerImageError ? error.message : "This image could not be opened. Try a PNG, JPG or WebP.");
      } finally {
        setIsProcessing(false);
      }
    },
    [scope]
  );

  const requestClose = useCallback(() => {
    if (!is_saving) onClose();
  }, [is_saving, onClose]);

  // Escape closes, Ctrl or Cmd + V pastes a copied image.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        requestClose();
      }
    };
    const handlePaste = (event: ClipboardEvent) => {
      const image_file = Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith("image/"));
      if (image_file && !is_busy) {
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
  }, [requestClose, handleFile, is_busy]);

  const discardNewImage = () => {
    if (draft.image?.kind === "new") releasePreparedImage(draft.image.prepared);
    updateDraft(draftFromSaved(saved_banner));
    setErrorMessage(null);
  };

  const finishWrite = (next_state: HomeBannerState, scope_written: HomeBannerScope) => {
    onSaved(next_state);
    const saved = scope_written === "organization" ? next_state.organization : next_state.personal;
    setDrafts((current) => {
      const previous = current[scope_written].image;
      if (previous?.kind === "new") releasePreparedImage(previous.prepared);
      return { ...current, [scope_written]: draftFromSaved(saved) };
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
      finishWrite(next_state, scope);
      toast.success(scope === "organization" ? "Organization banner saved" : "Your banner is saved", {
        description: scope === "organization" ? `Everyone at ${company_name} sees it on Home.` : "It now shows on your Home.",
      });
      onClose();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, "The banner could not be saved. Try again."));
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  const remove = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const next_state = await homeBannerService.removeBanner(scope);
      finishWrite(next_state, scope);
      setIsConfirmingRemove(false);
      toast.success(scope === "organization" ? "Organization banner removed" : "Your banner was removed");
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, "The banner could not be removed. Try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const scope_note = useMemo(() => {
    if (scope === "organization") {
      return `Everyone at ${company_name} sees this banner on Home, unless they set their own.`;
    }
    return state.organization
      ? `Only you see this banner. It replaces the ${company_name} banner on your Home.`
      : "Only you see this banner. It replaces the default design on your Home.";
  }, [scope, company_name, state.organization]);

  const empty_hint =
    scope === "personal" && state.organization
      ? `Right now you see the ${company_name} banner. Upload your own to replace it just for you.`
      : undefined;

  const image_details = (() => {
    if (!draft.image) return null;
    if (draft.image.kind === "new") {
      const { prepared } = draft.image;
      const saved_share = prepared.original_size > 0 ? 1 - prepared.prepared_size / prepared.original_size : 0;
      return {
        name: prepared.original_name,
        summary:
          saved_share > 0.05
            ? `${formatFileSize(prepared.original_size)} optimized to ${formatFileSize(prepared.prepared_size)}`
            : formatFileSize(prepared.prepared_size),
        dimensions: `${prepared.width} x ${prepared.height} px`,
        notes: prepared.notes,
      };
    }
    const { banner } = draft.image;
    return {
      name: banner.original_name ?? "Banner image",
      summary:
        banner.original_size > banner.stored_size
          ? `${formatFileSize(banner.original_size)} optimized to ${formatFileSize(banner.stored_size)}`
          : formatFileSize(banner.stored_size),
      dimensions: `${banner.width} x ${banner.height} px`,
      notes: banner.updated_by ? [`Last changed by ${banner.updated_by.full_name}.`] : [],
    };
  })();

  const save_label = is_saving
    ? upload_progress !== null && upload_progress < 1
      ? `Uploading ${Math.round(upload_progress * 100)}%`
      : "Saving..."
    : "Save banner";

  return createPortal(
    <div className="home-banner-theme home-banner-overlay">
      <div className="home-banner-backdrop" onClick={requestClose} aria-hidden="true" />
      <div ref={dialog_ref} role="dialog" aria-modal="true" aria-labelledby={title_id} tabIndex={-1} className="home-banner-dialog">
        <header className="home-banner-header">
          <div className="min-w-0 flex-1">
            <h2 id={title_id} className="home-banner-title font-heading">
              <Sparkles className="h-5 w-5 text-brand-500" aria-hidden="true" />
              {scope === "organization" && !allow_scope_switch ? "Organization Home banner" : "Customize your Home banner"}
            </h2>
            <p className="home-banner-subtitle">{scope_note}</p>
          </div>
          <button type="button" onClick={requestClose} disabled={is_saving} aria-label="Close" className="home-banner-close">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {allow_scope_switch ? (
          <div className="home-banner-scope" role="tablist" aria-label="Whose banner">
            {(
              [
                { value: "personal", label: "Just for me", icon: UserIcon },
                { value: "organization", label: `Everyone at ${company_name}`, icon: Building2 },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={scope === option.value}
                className="home-banner-scope-tab"
                disabled={is_busy}
                onClick={() => {
                  setScope(option.value);
                  setErrorMessage(null);
                  setIsConfirmingRemove(false);
                }}
              >
                <option.icon className="h-4 w-4" aria-hidden="true" />
                <span className="truncate">{option.label}</span>
                {drafts[option.value].image?.kind === "new" ? <span className="home-banner-dot" aria-label="Unsaved image" /> : null}
              </button>
            ))}
          </div>
        ) : null}

        <div className="home-banner-body">
          <div className="home-banner-stage-column">
            <div ref={stage_ref} className="home-banner-stage" data-device={active_device}>
              {preview_image ? (
                <BannerFrame
                  device={active_device}
                  image={preview_image}
                  framing={draft.framing}
                  greeting={greeting}
                  max_width={stage_width}
                  max_height={STAGE_MAX_HEIGHT}
                  show_guides={show_guides}
                  onFramingChange={updateFraming}
                />
              ) : (
                <BannerDropZone
                  is_processing={is_processing}
                  onBrowse={() => file_input_ref.current?.click()}
                  onFile={(file) => void handleFile(file)}
                  hint={empty_hint}
                />
              )}
            </div>

            {preview_image ? (
              <>
                <div className="home-banner-devices" role="tablist" aria-label="Preview on">
                  {BANNER_DEVICES.map((device) => (
                    <button
                      key={device.id}
                      type="button"
                      role="tab"
                      aria-selected={active_device === device.id}
                      className="home-banner-device"
                      onClick={() => setActiveDevice(device.id)}
                    >
                      <span className="home-banner-device-preview">
                        <BannerFrame
                          device={device.id}
                          image={preview_image}
                          framing={draft.framing}
                          greeting={greeting}
                          max_width={device.id === "phone" ? 64 : device.id === "tablet" ? 118 : 168}
                          max_height={44}
                        />
                      </span>
                      <span className="home-banner-device-label">{device.label}</span>
                    </button>
                  ))}
                </div>

                <div className="home-banner-file">
                  <span className="home-banner-file-icon" aria-hidden="true">
                    <ImageUp className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="home-banner-file-name" title={image_details?.name}>
                      {image_details?.name}
                      {is_new_image ? <span className="home-banner-badge">Not saved yet</span> : null}
                    </p>
                    <p className="home-banner-file-meta">
                      {image_details?.summary} · {image_details?.dimensions}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="home-banner-chip-button"
                    aria-pressed={show_guides}
                    onClick={() => setShowGuides((current) => !current)}
                  >
                    {show_guides ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                    Guides
                  </button>
                  <button type="button" className="home-banner-chip-button" onClick={() => file_input_ref.current?.click()} disabled={is_busy}>
                    {is_processing ? "Optimizing..." : "Replace"}
                  </button>
                  {is_new_image && saved_banner ? (
                    <button type="button" className="home-banner-chip-button" onClick={discardNewImage} disabled={is_busy}>
                      Keep current
                    </button>
                  ) : null}
                </div>
                {image_details?.notes.length ? (
                  <ul className="home-banner-notes">
                    {image_details.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}

            {error_message ? (
              <p className="home-banner-error" role="alert">
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

          <aside className="home-banner-controls-column" aria-disabled={!preview_image || undefined}>
            <fieldset disabled={!preview_image || is_saving} className="contents">
              <legend className="sr-only">Banner style</legend>
              <BannerControls
                framing={draft.framing}
                resolved_tone={resolved_tone}
                onChange={updateFraming}
                onReset={() => updateFraming(DEFAULT_BANNER_FRAMING)}
              />
            </fieldset>
          </aside>
        </div>

        <footer className="home-banner-footer">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {saved_banner ? (
              is_confirming_remove ? (
                <div className="home-banner-confirm" role="group" aria-label="Confirm removal">
                  <span>
                    {scope === "organization"
                      ? "Remove it for everyone?"
                      : state.organization
                        ? `Go back to the ${company_name} banner?`
                        : "Go back to the default design?"}
                  </span>
                  <button type="button" className="home-banner-button" data-variant="danger" onClick={() => void remove()} disabled={is_saving}>
                    Remove
                  </button>
                  <button type="button" className="home-banner-button" data-variant="ghost" onClick={() => setIsConfirmingRemove(false)} disabled={is_saving}>
                    Keep
                  </button>
                </div>
              ) : (
                <button type="button" className="home-banner-button" data-variant="ghost-danger" onClick={() => setIsConfirmingRemove(true)} disabled={is_busy}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove banner
                </button>
              )
            ) : null}
          </div>
          <button type="button" className="home-banner-button" data-variant="secondary" onClick={requestClose} disabled={is_saving}>
            Cancel
          </button>
          <button
            type="button"
            className="home-banner-button home-banner-save"
            data-variant="primary"
            onClick={() => void save()}
            disabled={!is_dirty || is_busy}
            style={upload_progress !== null ? ({ "--upload-progress": `${upload_progress * 100}%` } as React.CSSProperties) : undefined}
          >
            {save_label}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default HomeBannerEditor;
