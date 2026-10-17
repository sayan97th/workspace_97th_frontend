import "./profile.scss";

/**
 * Shared style recipes for the form cards hosted by My Profile > Password ({@link ChangePasswordSection},
 * {@link TwoFactorSection}) and the Users directory edit page. monday look: 4px radius 40px inputs with a
 * gray border that turns blue on focus, primary color buttons, built on the theme aware `shell-*` tokens
 * (redeclared to monday's light palette inside `.profile-theme`) and the `--profile-*` tokens.
 */

export const cardClass = "rounded-lg border border-shell-border bg-shell-panel p-6 max-sm:p-4";

export const labelClass = "mb-1.5 block text-[14px] font-normal text-shell-text-secondary";

export const inputClass = (has_error = false) =>
  `h-10 w-full rounded-[4px] border bg-shell-panel px-3 text-[14px] text-shell-text outline-none transition-colors placeholder:text-shell-text-faint disabled:cursor-not-allowed disabled:opacity-60 ${
    has_error
      ? "border-[var(--profile-danger-text)] focus:border-[var(--profile-danger-text)]"
      : "border-shell-border-strong hover:border-shell-text focus:border-[var(--profile-accent)]"
  }`;

export const primaryButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-[4px] bg-[var(--profile-primary)] px-4 text-[14px] font-normal text-white transition-colors hover:bg-[var(--profile-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50";

export const outlineButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-[4px] border border-shell-border-strong px-4 text-[14px] font-normal text-shell-text transition-colors hover:bg-shell-hover disabled:cursor-not-allowed disabled:opacity-50";

export const dangerButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-[4px] bg-[var(--profile-danger-text)] px-4 text-[14px] font-normal text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
