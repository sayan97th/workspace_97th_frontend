"use client";
import React, { useRef, useState } from "react";
import { useBrandingManager } from "../useBrandingManager";

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
  is_busy: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
  preview_shape?: "rounded" | "rect";
  preview_size?: { width: number; height: number };
};

const Dropzone: React.FC<DropzoneProps> = ({
  label,
  hint,
  preview_url,
  is_busy,
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
        if (!is_busy) handleFiles(event.dataTransfer.files);
      }}
      onClick={() => !is_busy && input_ref.current?.click()}
      className={`flex items-center gap-4 rounded-xl border-[1.5px] border-dashed p-[18px] transition-colors ${
        is_busy ? "cursor-default opacity-60" : "cursor-pointer"
      } ${is_drag_over ? "border-brand-200 bg-brand-500/[0.08]" : "border-brand-200/40 bg-brand-500/[0.04]"}`}
    >
      <input
        ref={input_ref}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={is_busy}
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div
        className={`flex flex-none items-center justify-center overflow-hidden border border-shell-border-strong bg-shell-panel-alt ${
          preview_shape === "rounded" ? "rounded-xl" : "rounded-lg"
        }`}
        style={{ width: preview_size.width, height: preview_size.height }}
      >
        {preview_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview_url} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="text-[11px] text-shell-text-faint">{label}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-[3px] flex items-center gap-2 text-[13.5px] font-bold text-shell-text">
          <UploadGlyph />
          {is_busy ? "Uploading…" : `Upload a new ${label.toLowerCase()}`}
        </div>
        <div className="text-[12px] leading-relaxed text-shell-text-muted">{hint}</div>
        {preview_url && !is_busy ? (
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
 * notification email header, uploaded to the Laravel API via {@link useBrandingManager}.
 * `AppTopBar`'s logo badge reads the lighter-weight `useAccountBranding()` instead, since it
 * needs to work for any authenticated user, not just the staff roles that can reach this page.
 */
const BrandingSection: React.FC = () => {
  const branding = useBrandingManager();

  return (
    <div className="max-w-[620px]">
      {branding.error ? (
        <div className="mb-5 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
          {branding.error}
        </div>
      ) : null}

      <div className="mb-1.5 text-[15px] font-bold text-shell-text">Main menu logo</div>
      <p className="mb-[18px] text-[13px] leading-relaxed text-shell-text-muted">
        This appears in the top-left of the main menu across the account. Recommended: 40×40px PNG with a
        transparent background.
      </p>

      <div className="mb-9 flex items-stretch gap-5 rounded-2xl border border-shell-border bg-shell-panel-alt p-[22px]">
        <div className="flex flex-none flex-col items-center gap-2">
          <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel-alt">
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logo_url} alt="Current logo" className="h-full w-full object-contain" />
            ) : (
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-brand-500 text-[13px] font-bold text-white">
                97
              </span>
            )}
          </div>
          <span className="text-[11px] text-shell-text-faint">Current</span>
        </div>

        <div className="w-px bg-shell-hover-strong" />

        <div className="min-w-0 flex-1">
          <Dropzone
            label="Logo"
            hint="Drag and drop a PNG here, or click the tile to browse. 40×40px, transparent background."
            preview_url={branding.logo_url}
            is_busy={branding.is_uploading_logo}
            onFile={(file) => void branding.uploadLogo(file)}
            onRemove={() => void branding.removeLogo()}
          />
        </div>
      </div>

      <div className="mb-1.5 text-[15px] font-bold text-shell-text">Email header</div>
      <p className="mb-[18px] text-[13px] leading-relaxed text-shell-text-muted">
        Shown at the top of account notification emails. Recommended resolution 580×80px.
      </p>

      <div className="rounded-2xl border border-shell-border bg-shell-panel-alt p-[22px]">
        <Dropzone
          label="Email header"
          hint="Drag and drop, or click to browse. 580×80px."
          preview_url={branding.email_header_url}
          is_busy={branding.is_uploading_email_header}
          onFile={(file) => void branding.uploadEmailHeader(file)}
          onRemove={() => void branding.removeEmailHeader()}
          preview_shape="rect"
          preview_size={{ width: 96, height: 64 }}
        />
      </div>
    </div>
  );
};

export default BrandingSection;
