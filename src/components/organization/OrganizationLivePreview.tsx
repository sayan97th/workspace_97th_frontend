"use client";
import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";
import { DEFAULT_BRAND_COLOR, buildBrandPalette, isHexColor } from "@/lib/brand-theme";
import type { OrganizationDto } from "@/types/organization";
import AnnouncementBar from "./AnnouncementBar";
import type { OrganizationFormValues } from "./organization-form";

type PreviewTheme = "light" | "dark";

const PREVIEW_COLORS: Record<PreviewTheme, { chrome: string; page: string; text: string; muted: string; line: string; tab: string }> = {
  light: { chrome: "#f6f7fb", page: "#ffffff", text: "#323338", muted: "#9699a6", line: "#e7e9ef", tab: "#ffffff" },
  dark: { chrome: "#181b34", page: "#20233f", text: "#e6e7ee", muted: "#8b8ea8", line: "rgba(255,255,255,0.08)", tab: "#2b2f52" },
};

/**
 * A miniature of the app painted with the unsaved draft: browser tab with the favicon, top bar
 * with the logo, the announcement and a page using the brand color. Lets admins try a color or
 * a logo in light and dark before anyone else sees it.
 */
const OrganizationLivePreview: React.FC<{ organization: OrganizationDto; draft: OrganizationFormValues }> = ({
  organization,
  draft,
}) => {
  const [preview_theme, setPreviewTheme] = useState<PreviewTheme>("light");
  const colors = PREVIEW_COLORS[preview_theme];
  const typed_color = draft.brand_color.trim().toLowerCase();
  const palette = useMemo(
    () => buildBrandPalette(isHexColor(typed_color) ? typed_color : DEFAULT_BRAND_COLOR),
    [typed_color]
  );
  const company_name = draft.company_name.trim() || organization.company_name;
  const today_label = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const logo_url = preview_theme === "dark" ? organization.logo_dark_url ?? organization.logo_url : organization.logo_url;

  return (
    <div className="rounded-xl border border-shell-border bg-shell-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[13.5px] font-semibold text-shell-text">Live preview</div>
        <div className="flex rounded-md bg-shell-panel-alt p-0.5" role="radiogroup" aria-label="Preview theme">
          {(["light", "dark"] as PreviewTheme[]).map((theme) => (
            <button
              key={theme}
              type="button"
              role="radio"
              aria-checked={preview_theme === theme}
              onClick={() => setPreviewTheme(theme)}
              className={`rounded px-2.5 py-1 text-[12px] font-medium capitalize transition-colors ${
                preview_theme === theme ? "bg-shell-panel text-shell-text shadow-sm" : "text-shell-text-muted hover:text-shell-text"
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      <div
        className="overflow-hidden rounded-lg border border-shell-border text-[11px] shadow-[0_6px_20px_rgba(0,0,0,0.06)]"
        style={{ ...(palette as React.CSSProperties), backgroundColor: colors.chrome, color: colors.text }}
        aria-hidden="true"
      >
        {/* Browser tab */}
        <div className="flex h-7 items-end gap-1.5 bg-black/[0.06] px-2">
          <div className="flex h-[22px] max-w-[60%] items-center gap-1.5 rounded-t-md px-2" style={{ backgroundColor: colors.tab }}>
            {organization.favicon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={organization.favicon_url} alt="" className="h-3 w-3 flex-none object-contain" />
            ) : (
              <BrandLogo size={12} className="!rounded-[2px]" />
            )}
            <span className="truncate">Home | {company_name}</span>
          </div>
        </div>

        {/* Top bar */}
        <div className="flex h-9 items-center gap-2 px-2.5">
          {logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo_url} alt="" className="h-[22px] w-auto max-w-[48px] flex-none object-contain" />
          ) : (
            <BrandLogo size={22} />
          )}
          {draft.show_name_in_top_bar ? <span className="max-w-[90px] truncate font-semibold">{company_name}</span> : null}
          <span
            className="mx-auto flex h-5 w-[42%] items-center gap-1 rounded px-1.5"
            style={{ backgroundColor: colors.page, color: colors.muted, border: `1px solid ${colors.line}` }}
          >
            <Search className="h-2.5 w-2.5" />
            Search
          </span>
          <span className="h-5 w-5 flex-none rounded-full bg-brand-500" />
        </div>

        {draft.announcement_enabled && draft.announcement_message.trim() ? (
          <AnnouncementBar
            message={draft.announcement_message.trim()}
            tone={draft.announcement_tone}
            theme={preview_theme}
            className="!min-h-0 !px-2.5 !py-1 !text-[10.5px] [&_svg]:!h-3 [&_svg]:!w-3"
          />
        ) : null}

        {/* Rail and page */}
        <div className="flex h-[150px]">
          <div className="flex w-9 flex-none flex-col items-center gap-2 pt-2.5">
            <span className="h-4 w-4 rounded bg-brand-100" />
            <span className="h-4 w-4 rounded" style={{ backgroundColor: colors.line }} />
            <span className="h-4 w-4 rounded" style={{ backgroundColor: colors.line }} />
          </div>
          <div className="flex-1 rounded-tl-lg p-3" style={{ backgroundColor: colors.page, borderLeft: `1px solid ${colors.line}`, borderTop: `1px solid ${colors.line}` }}>
            <div className="mb-0.5" style={{ color: colors.muted }}>
              {draft.company_tagline.trim() || today_label}
            </div>
            <div className="mb-2.5 text-[14px] font-semibold">Good morning</div>
            <div className="mb-2.5 flex gap-1.5">
              <span className="rounded bg-brand-500 px-2 py-1 font-semibold text-white">New item</span>
              <span className="rounded border border-brand-500 px-2 py-1 font-semibold text-brand-500">Invite</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              <span className="font-semibold text-brand-500">Open My work</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2.5 text-[12px] leading-relaxed text-shell-text-muted">
        Unsaved changes show here first. Logos and the favicon update as soon as they upload.
      </p>
    </div>
  );
};

export default OrganizationLivePreview;
