"use client";
import React, { useRef, useState } from "react";
import { useBranding } from "@/context/BrandingContext";

const UploadGlyph = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" className="flex-none text-brand-200">
    <path
      d="M8 2.5 V10.5 M8 2.5 L5 5.5 M8 2.5 L11 5.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 11 V12.5 A1 1 0 0 0 4 13.5 H12 A1 1 0 0 0 13 12.5 V11"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
    />
  </svg>
);

type DropzoneProps = {
  label: string;
  hint: string;
  preview_url: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  preview_shape?: "rounded" | "rect";
  preview_size?: { width: number; height: number };
};

const Dropzone: React.FC<DropzoneProps> = ({
  label,
  hint,
  preview_url,
  onFile,
  onRemove,
  preview_shape = "rounded",
  preview_size = { width: 64, height: 64 },
}) => {
  const input_ref = useRef<HTMLInputElement>(null);
  const [is_drag_over, setIsDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) onFile(file);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        handleFiles(event.dataTransfer.files);
      }}
      onClick={() => input_ref.current?.click()}
      className={`flex cursor-pointer items-center gap-4 rounded-xl border-[1.5px] border-dashed p-[18px] transition-colors ${
        is_drag_over ? "border-brand-200 bg-brand-500/[0.08]" : "border-brand-200/40 bg-brand-500/[0.04]"
      }`}
    >
      <input
        ref={input_ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div
        className={`flex flex-none items-center justify-center overflow-hidden border border-white/10 bg-[#142020] ${
          preview_shape === "rounded" ? "rounded-xl" : "rounded-lg"
        }`}
        style={{ width: preview_size.width, height: preview_size.height }}
      >
        {preview_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview_url} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="text-[11px] text-[#7e8889]">{label}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-[3px] flex items-center gap-2 text-[13.5px] font-bold text-[#e9eded]">
          <UploadGlyph />
          Upload a new {label.toLowerCase()}
        </div>
        <div className="text-[12px] leading-relaxed text-[#9aa4a5]">{hint}</div>
        {preview_url ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className="mt-2 text-[12px] font-semibold text-[#ff8a94] hover:underline"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
};

/**
 * Administration > Customization > Branding — the account's main-menu logo and
 * notification email header. This is the flagship control the whole Administration
 * modal was built to expose, so it talks straight to {@link useBranding} (the account-wide
 * branding context {@link AppTopBar}'s logo badge reads from) rather than routing through
 * {@link useAdministrationManager}, the same way {@link AccountMenu} calls `useTheme()`
 * directly for a single cross-cutting concern.
 */
const BrandingSection: React.FC = () => {
  const branding = useBranding();

  return (
    <div className="max-w-[620px]">
      <div className="mb-1.5 text-[15px] font-bold text-[#edf1f1]">Main menu logo</div>
      <p className="mb-[18px] text-[13px] leading-relaxed text-[#9aa4a5]">
        This appears in the top-left of the main menu across the account. Recommended: 40×40px PNG with a
        transparent background.
      </p>

      <div className="mb-9 flex items-stretch gap-5 rounded-2xl border border-white/[0.08] bg-[#0b1616] p-[22px]">
        <div className="flex flex-none flex-col items-center gap-2">
          <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#142020]">
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logo_url} alt="Current logo" className="h-full w-full object-contain" />
            ) : (
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-brand-500 text-[13px] font-bold text-white">
                97
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#7e8889]">Current</span>
        </div>

        <div className="w-px bg-white/[0.08]" />

        <div className="min-w-0 flex-1">
          <Dropzone
            label="Logo"
            hint="Drag & drop a PNG here, or click the tile to browse. 40×40px, transparent background."
            preview_url={branding.logo_url}
            onFile={branding.setLogo}
            onRemove={branding.removeLogo}
          />
        </div>
      </div>

      <div className="mb-1.5 text-[15px] font-bold text-[#edf1f1]">Email header</div>
      <p className="mb-[18px] text-[13px] leading-relaxed text-[#9aa4a5]">
        Shown at the top of account notification emails. Recommended resolution 580×80px.
      </p>

      <div className="rounded-2xl border border-white/[0.08] bg-[#0b1616] p-[22px]">
        <Dropzone
          label="Email header"
          hint="Drag & drop, or click to browse — 580×80px"
          preview_url={branding.email_header_url}
          onFile={branding.setEmailHeader}
          onRemove={branding.removeEmailHeader}
          preview_shape="rect"
          preview_size={{ width: 96, height: 64 }}
        />
      </div>
    </div>
  );
};

export default BrandingSection;
