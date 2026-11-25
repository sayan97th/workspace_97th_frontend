"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { GalleryHorizontalEnd, ImagePlus, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import HomeBannerEditor from "@/components/home-banner/HomeBannerEditor";
import BannerFrame from "@/components/home-banner/BannerFrame";
import { BANNER_DESIGN_TIPS, BANNER_SPECS } from "@/components/home-banner/BannerDropZone";
import { formatFileSize } from "@/components/home-banner/prepareBannerImage";
import { framingOf } from "@/components/home-banner/bannerFraming";
import { useHomeBanner } from "@/components/home-banner/useHomeBanner";
import { OrganizationCard } from "../organization-fields";
import "@/components/home-banner/home-banner.css";

type HomeBannerCardProps = {
  company_name: string;
  is_read_only: boolean;
};

const SAMPLE_RECAP = "You have 3 items due today and 2 unread updates.";

/**
 * Administration > Organization > Home banner: the background image of the welcome card on Home
 * for everyone in the organization. People who upload their own banner keep seeing theirs.
 * Saves through its own endpoint, apart from the page's Save button.
 */
const HomeBannerCard: React.FC<HomeBannerCardProps> = ({ company_name, is_read_only }) => {
  const { user } = useAuth();
  const { state, is_loaded, applyState } = useHomeBanner();
  const [is_editor_open, setIsEditorOpen] = useState(false);
  const preview_ref = useRef<HTMLDivElement>(null);
  const [preview_width, setPreviewWidth] = useState(560);
  const today = useMemo(() => new Date(), []);
  const banner = state?.organization ?? null;
  const greeting = { user, today, recap: SAMPLE_RECAP };

  useEffect(() => {
    const preview = preview_ref.current;
    if (!preview) return;
    const observer = new ResizeObserver(([entry]) => setPreviewWidth(Math.max(200, Math.floor(entry.contentRect.width))));
    observer.observe(preview);
    return () => observer.disconnect();
  }, []);

  return (
    <OrganizationCard
      id="home_banner"
      icon={GalleryHorizontalEnd}
      title="Home banner"
      description={`The image behind the welcome greeting on Home, for everyone at ${company_name}. People who choose their own banner keep seeing theirs.`}
    >
      <div ref={preview_ref} className="organization-home-banner-preview">
        {banner ? (
          <BannerFrame device="desktop" image={banner} framing={framingOf(banner)} greeting={greeting} max_width={preview_width} />
        ) : (
          <div className="organization-home-banner-empty">
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
            <p className="text-[14px] font-semibold text-shell-text">{is_loaded ? "Using the default design" : "Loading banner..."}</p>
            <p className="max-w-[360px] text-[13px] leading-5 text-shell-text-secondary">
              Upload a brand image or photo and everyone sees it on Home the next time they open it.
            </p>
          </div>
        )}
      </div>

      {banner ? (
        <p className="mt-2.5 text-[12.5px] text-shell-text-faint">
          {banner.original_name ?? "Banner image"} · {formatFileSize(banner.stored_size)} · {banner.width} x {banner.height} px
          {banner.updated_by ? ` · Last changed by ${banner.updated_by.full_name}` : ""}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="admin-button admin-button-primary" onClick={() => setIsEditorOpen(true)} disabled={is_read_only || !is_loaded}>
          {banner ? <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
          {banner ? "Customize banner" : "Upload banner"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 border-t border-shell-border pt-4 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-[13px] font-semibold text-shell-text">Image specs for designers</h4>
          <dl className="grid gap-1.5">
            {BANNER_SPECS.map((spec) => (
              <div key={spec.label} className="flex justify-between gap-3 text-[13px]">
                <dt className="text-shell-text-secondary">{spec.label}</dt>
                <dd className="text-right font-medium text-shell-text">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h4 className="mb-2 text-[13px] font-semibold text-shell-text">Design tips</h4>
          <ul className="list-disc space-y-1 pl-4 text-[13px] leading-5 text-shell-text-secondary">
            {BANNER_DESIGN_TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>

      {is_editor_open && state ? (
        <HomeBannerEditor
          onClose={() => setIsEditorOpen(false)}
          initial_scope="organization"
          state={state}
          onSaved={applyState}
          allow_scope_switch={false}
          greeting={greeting}
          company_name={company_name}
        />
      ) : null}
    </OrganizationCard>
  );
};

export default HomeBannerCard;
