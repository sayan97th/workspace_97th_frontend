/**
 * Shared style recipes for the My Profile > Personal info / Password real-API-backed
 * components ({@link ProfileForm}, {@link ChangePasswordSection}, {@link TwoFactorSection}).
 * Single source of truth so the three components don't drift from each other or from the
 * `shell-*` token layering used by the rest of the modal: page (`shell-panel`, inherited) >
 * card (`shell-panel-alt`) > field (`shell-bg`), each with a visibly stronger border.
 */

export const cardClass = "rounded-2xl border border-shell-border bg-shell-panel-alt p-6";

export const labelClass = "mb-2 block text-[13px] font-semibold text-shell-text-secondary";

export const inputClass = (has_error = false) =>
  `w-full rounded-[9px] border bg-shell-bg px-[13px] py-[11px] text-[14px] text-shell-text outline-none transition-colors placeholder:text-shell-text-faint disabled:cursor-not-allowed disabled:opacity-60 ${
    has_error
      ? "border-[#e2445c] focus:border-[#e2445c]"
      : "border-shell-border-strong focus:border-brand-500"
  }`;

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-[9px] bg-brand-500 px-[18px] py-[10px] text-[13px] font-bold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50";

export const outlineButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-[18px] py-[10px] text-[13px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-not-allowed disabled:opacity-50";

export const dangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-[9px] bg-[#e2445c] px-4 py-[10px] text-[13px] font-bold text-white transition-colors hover:bg-[#c22d45] disabled:cursor-not-allowed disabled:opacity-50";
