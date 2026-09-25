"use client";
import React, { useEffect, useState } from "react";
import { CheckIcon, LinkIcon } from "@/icons/workspace-icons";

export type CopyLinkFieldProps = {
  link: string;
  /** Renders the field faded and the button disabled, for a link that is turned off. */
  is_disabled?: boolean;
};

/**
 * A read only link with a Copy button that briefly confirms "Copied". The
 * inline counterpart of {@link import("./modal/CopyLinkModal").default}, for
 * dialogs that show a link next to other settings.
 */
const CopyLinkField: React.FC<CopyLinkFieldProps> = ({ link, is_disabled = false }) => {
  const [is_copied, setIsCopied] = useState(false);

  useEffect(() => {
    setIsCopied(false);
  }, [link]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // The clipboard can be unavailable (insecure context), the link stays selectable.
    }
  };

  return (
    <div className={`flex gap-2.5 ${is_disabled ? "opacity-50" : ""}`}>
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-shell-border-strong bg-shell-bg px-3.5 py-[10px] text-[13px] text-shell-text-secondary">
        <LinkIcon size={14} className="flex-none text-shell-text-muted" />
        <span className="truncate select-all">{link}</span>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        disabled={is_disabled}
        className="flex flex-none items-center gap-2 rounded-[10px] border border-shell-border-strong px-4 text-[13px] font-semibold text-shell-text transition-colors hover:border-brand-500 disabled:cursor-not-allowed"
      >
        {is_copied ? (
          <>
            <CheckIcon size={13} className="text-success-400" />
            Copied
          </>
        ) : (
          "Copy"
        )}
      </button>
    </div>
  );
};

export default CopyLinkField;
