"use client";
import React, { useEffect, useId, useRef } from "react";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
import type { HomeBannerDto, HomeBannerFraming } from "@/types/home-banner";
import HomeBannerImage from "./HomeBannerImage";
import type { BannerPreviewImage } from "./BannerFrame";
import { resolveTextTone } from "./bannerFraming";

type BannerRemoveConfirmProps = {
  /** The banner about to be removed, with its current framing. */
  current: { image: BannerPreviewImage; framing: HomeBannerFraming };
  /** What Home shows afterwards: the organization banner, or null for the default design. */
  fallback: HomeBannerDto | null;
  fallback_label: string;
  title: string;
  is_removing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** A small banner card, the image with its framing and gradient, plus a few lines standing in for the greeting. */
const BannerThumb: React.FC<{ image: BannerPreviewImage | null; framing: HomeBannerFraming | null; label: string; is_leaving?: boolean }> = ({
  image,
  framing,
  label,
  is_leaving = false,
}) => {
  const tone = image && framing ? resolveTextTone(framing.text_tone, image.luminance, framing.overlay_opacity, framing.overlay_color) : "dark";

  return (
    <figure className="hb-thumb" data-leaving={is_leaving || undefined}>
      <div className="hb-thumb-card" data-tone={tone} data-default={!image || undefined}>
        {image && framing ? <HomeBannerImage source={image} framing={framing} tone={tone} sizes="180px" /> : null}
        <span className="hb-thumb-lines" aria-hidden="true">
          <span />
          <span />
        </span>
        {is_leaving ? (
          <span className="hb-thumb-badge" aria-hidden="true">
            <Trash2 className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <figcaption className="hb-thumb-label">{label}</figcaption>
    </figure>
  );
};

/**
 * Confirmation laid over the editor before a saved banner is deleted. It shows the banner going
 * away next to the one that takes its place, so nobody is surprised by what Home looks like after.
 */
const BannerRemoveConfirm: React.FC<BannerRemoveConfirmProps> = ({
  current,
  fallback,
  fallback_label,
  title,
  is_removing,
  onCancel,
  onConfirm,
}) => {
  const title_id = useId();
  const cancel_ref = useRef<HTMLButtonElement>(null);

  // Safe choice first: focus lands on Cancel.
  useEffect(() => {
    cancel_ref.current?.focus();
  }, []);

  return (
    <div className="hb-remove-layer">
      <div className="hb-remove-scrim" onClick={is_removing ? undefined : onCancel} aria-hidden="true" />
      <div role="alertdialog" aria-modal="true" aria-labelledby={title_id} className="hb-remove-card" aria-busy={is_removing || undefined}>
        <div className="hb-remove-compare">
          <BannerThumb image={current.image} framing={current.framing} label="Current" is_leaving />
          <span className="hb-remove-arrow" aria-hidden="true">
            <ArrowRight className="h-4 w-4" />
          </span>
          <BannerThumb image={fallback} framing={fallback} label={fallback_label} />
        </div>

        <h3 id={title_id} className="hb-remove-title font-heading">
          {title}
        </h3>
        <p className="hb-remove-text">This can&apos;t be undone.</p>

        <div className="hb-remove-actions">
          <button ref={cancel_ref} type="button" className="hb-button" data-variant="secondary" onClick={onCancel} disabled={is_removing}>
            Cancel
          </button>
          <button type="button" className="hb-button" data-variant="danger" onClick={onConfirm} disabled={is_removing}>
            {is_removing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
            {is_removing ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BannerRemoveConfirm;
