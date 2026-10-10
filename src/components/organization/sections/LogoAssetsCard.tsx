"use client";
import React, { useRef, useState } from "react";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";
import type { OrganizationAssetKey, OrganizationDto } from "@/types/organization";
import { OrganizationCard, ToggleField } from "../organization-fields";
import { assetAcceptAttribute, assetRuleLabel } from "../useOrganizationSettings";
import type { OrganizationSectionProps } from "./section-props";

type AssetTileProps = {
  asset: OrganizationAssetKey;
  title: string;
  description: string;
  image_url: string | null;
  /** Shown faded when this asset is empty, e.g. the light logo inside the dark preview. */
  fallback_url?: string | null;
  company_name: string;
  is_busy: boolean;
  is_disabled: boolean;
  onUpload: (asset: OrganizationAssetKey, file: File) => void;
  onRemove: (asset: OrganizationAssetKey) => void;
};

/** What the asset looks like where it is really used: the light top bar, the dark top bar or a browser tab. */
const AssetPreview: React.FC<Pick<AssetTileProps, "asset" | "image_url" | "fallback_url" | "company_name">> = ({
  asset,
  image_url,
  fallback_url,
  company_name,
}) => {
  const shown_url = image_url ?? fallback_url ?? null;

  if (asset === "favicon") {
    return (
      <div className="flex h-[92px] items-end bg-[#dee1e6] px-3 pt-4">
        <div className="flex h-9 w-full max-w-[200px] items-center gap-2 rounded-t-lg bg-white px-3 shadow-[0_-1px_0_rgba(0,0,0,0.04)]">
          {image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image_url} alt="" className="h-4 w-4 flex-none object-contain" />
          ) : (
            <BrandLogo size={16} className="!rounded-[3px]" />
          )}
          <span className="truncate text-[12px] text-[#3c4043]">{company_name}</span>
        </div>
      </div>
    );
  }

  const is_dark = asset === "logo_dark";
  return (
    <div className={`flex h-[92px] items-center justify-center ${is_dark ? "bg-[#181b34]" : "organization-asset-checker"}`}>
      {shown_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shown_url}
          alt=""
          className={`max-h-10 max-w-[70%] object-contain ${image_url ? "" : "opacity-60"}`}
        />
      ) : (
        <BrandLogo size={40} />
      )}
    </div>
  );
};

/** One uploadable image: preview, drop zone, Replace and Remove. */
const AssetTile: React.FC<AssetTileProps> = (props) => {
  const { asset, title, description, image_url, is_busy, is_disabled, onUpload, onRemove } = props;
  const input_ref = useRef<HTMLInputElement>(null);
  const [is_drag_over, setIsDragOver] = useState(false);
  const is_inert = is_busy || is_disabled;

  const pickFile = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onUpload(asset, file);
  };

  return (
    <div
      onDragOver={(event) => {
        if (is_inert) return;
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        if (!is_inert) pickFile(event.dataTransfer.files);
      }}
      className={`flex flex-col overflow-hidden rounded-lg border transition-colors ${
        is_drag_over ? "border-brand-500 ring-2 ring-brand-500/20" : "border-shell-border"
      }`}
    >
      <div className="relative">
        <AssetPreview {...props} />
        {is_busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/50">
            <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-brand-500 border-t-transparent" />
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 border-t border-shell-border p-3.5">
        <div className="text-[13.5px] font-semibold text-shell-text">{title}</div>
        <p className="text-[12px] leading-relaxed text-shell-text-muted">{description}</p>
        <p className="text-[11.5px] text-shell-text-faint">{assetRuleLabel(asset)}</p>

        <input
          ref={input_ref}
          type="file"
          accept={assetAcceptAttribute(asset)}
          className="hidden"
          disabled={is_inert}
          onChange={(event) => {
            pickFile(event.target.files);
            event.target.value = "";
          }}
        />

        <div className="mt-auto flex items-center gap-2 pt-2.5">
          <button
            type="button"
            onClick={() => input_ref.current?.click()}
            disabled={is_inert}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-shell-border-strong px-3 text-[13px] font-medium text-shell-text transition-colors hover:bg-shell-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            {image_url ? "Replace" : "Upload"}
          </button>
          {image_url ? (
            <button
              type="button"
              onClick={() => onRemove(asset)}
              disabled={is_inert}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-[#d83a52] transition-colors hover:bg-[#fbe9ec] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#d83a52]/15"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

type LogoAssetsCardProps = OrganizationSectionProps & {
  organization: OrganizationDto;
  busy_asset: OrganizationAssetKey | null;
  onUpload: (asset: OrganizationAssetKey, file: File) => void;
  onRemove: (asset: OrganizationAssetKey) => void;
};

/** The top left corner logo, its dark mode variant and the browser favicon. */
const LogoAssetsCard: React.FC<LogoAssetsCardProps> = ({
  organization,
  draft,
  setField,
  is_read_only,
  busy_asset,
  onUpload,
  onRemove,
}) => {
  const company_name = draft.company_name.trim() || organization.company_name;
  const shared_props = { company_name, is_disabled: is_read_only, onUpload, onRemove };

  return (
    <OrganizationCard
      id="logo"
      icon={ImageIcon}
      title="Logo and favicon"
      description="Replace the 97th Floor mark in the top left corner of the app and the icon on the browser tab. Images save as soon as you upload them."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <AssetTile
          {...shared_props}
          asset="logo"
          title="Logo"
          description="Shown in the top left corner. A square or wide PNG with a transparent background works best, at least 64px tall."
          image_url={organization.logo_url}
          is_busy={busy_asset === "logo"}
        />
        <AssetTile
          {...shared_props}
          asset="logo_dark"
          title="Dark mode logo"
          description="Used while someone has the dark theme on. Without it, the regular logo is used."
          image_url={organization.logo_dark_url}
          fallback_url={organization.logo_url}
          is_busy={busy_asset === "logo_dark"}
        />
        <AssetTile
          {...shared_props}
          asset="favicon"
          title="Favicon"
          description="The small icon on browser tabs and bookmarks. Use a square image, 32 by 32 or larger."
          image_url={organization.favicon_url}
          is_busy={busy_asset === "favicon"}
        />
      </div>

      <div className="mt-5 border-t border-shell-border pt-4">
        <ToggleField
          label="Show the company name next to the logo"
          description="Adds the company name to the right of the logo in the top bar. Handy when the logo is only a symbol."
          is_on={draft.show_name_in_top_bar}
          onToggle={() => setField("show_name_in_top_bar", !draft.show_name_in_top_bar)}
          is_disabled={is_read_only}
        />
      </div>
    </OrganizationCard>
  );
};

export default LogoAssetsCard;
