"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { GalleryHorizontalEnd, ImagePlus, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import HomeBannerEditor from "@/components/home-banner/HomeBannerEditor";
import BannerFrame from "@/components/home-banner/BannerFrame";
import { BANNER_SPECS } from "@/components/home-banner/BannerDropZone";
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
      description={`Shown on everyone's Home, unless they pick their own.`}
    >
      <div ref={preview_ref} className="organization-home-banner-preview">
        {banner ? (
          <BannerFrame device="desktop" image={banner} framing={framingOf(banner)} greeting={greeting} max_width={preview_width} />
        ) : (
          <button
            type="button"
            className="organization-home-banner-empty"
            onClick={() => setIsEditorOpen(true)}
            disabled={is_read_only || !is_loaded}
            aria-label="Upload banner"
          >
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
            <span className="text-[14px] font-semibold text-shell-text">{is_loaded ? "No banner yet" : "Loading..."}</span>
          </button>
        )}
      </div>

      {banner ? (
        <p className="mt-2.5 text-[12.5px] text-shell-text-faint">
          {banner.original_name ?? "Banner"} · {formatFileSize(banner.stored_size)}
          {banner.updated_by ? ` · by ${banner.updated_by.full_name}` : ""}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="admin-button admin-button-primary" onClick={() => setIsEditorOpen(true)} disabled={is_read_only || !is_loaded}>
          {banner ? <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
          {banner ? "Edit banner" : "Upload banner"}
        </button>
        <span className="text-[12.5px] text-shell-text-faint">{BANNER_SPECS.join(" · ")}</span>
      </div>

      {is_editor_open && state ? (
        <HomeBannerEditor
          onClose={() => setIsEditorOpen(false)}
          scope="organization"
          state={state}
          onSaved={applyState}
          greeting={greeting}
          company_name={company_name}
        />
      ) : null}
    </OrganizationCard>
  );
};

export default HomeBannerCard;
