import React from "react";

export type SlackMessageBannerProps = {
  error: string | null;
  notice: string | null;
  onDismiss: () => void;
};

/** Inline success or error message shown above the Slack cards, dismissible. */
const SlackMessageBanner: React.FC<SlackMessageBannerProps> = ({ error, notice, onDismiss }) => {
  const message = error ?? notice;
  if (!message) return null;

  const tone_class = error
    ? "border-brand-500/30 bg-brand-500/[0.1] text-brand-200"
    : "border-[#00c875]/30 bg-[#00c875]/[0.1] text-[#3ddc97]";

  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-5 flex items-start justify-between gap-3 rounded-[9px] border px-3.5 py-2.5 text-[12.5px] font-medium ${tone_class}`}
    >
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="flex-none text-[12px] font-semibold opacity-70 hover:opacity-100">
        Dismiss
      </button>
    </div>
  );
};

export default SlackMessageBanner;
