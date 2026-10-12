import React from "react";
import Link from "next/link";
import { AlertCircle, Check, ChevronLeft, Eye, EyeOff, Loader2, type LucideIcon, X } from "lucide-react";

/** Single value of a page `searchParams` entry, the first one when the key repeats. */
export const readSearchParam = (value: string | string[] | undefined): string | null =>
  (Array.isArray(value) ? value[0] : value) ?? null;

type AuthFormContainerProps = {
  back_link?: { href: string; label: string };
  children: React.ReactNode;
};

/** Column content of an auth page: optional back link on top, then the vertically centered card. */
export const AuthFormContainer: React.FC<AuthFormContainerProps> = ({ back_link, children }) => (
  <>
    {back_link ? (
      <div className="auth-shell__content mb-6">
        <Link
          href={back_link.href}
          className="-ml-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-gray-500 transition-colors hover:bg-black/[0.04] hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white/90"
        >
          <ChevronLeft className="h-4 w-4" />
          {back_link.label}
        </Link>
      </div>
    ) : null}
    <div className="auth-shell__content auth-shell__content--centered">{children}</div>
  </>
);

export const AuthCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`auth-card ${className}`}>
    <div className="auth-card__body">{children}</div>
  </div>
);

const badge_tone_classes = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  success: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
  error: "bg-error-100 text-error-500 dark:bg-error-500/15 dark:text-error-400",
};

type AuthCardHeaderProps = {
  title: string;
  description: React.ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof badge_tone_classes;
};

/** Card title and supporting copy. With an icon the header is centered under a tinted badge. */
export const AuthCardHeader: React.FC<AuthCardHeaderProps> = ({ title, description, icon: Icon, tone = "brand" }) => (
  <div className={`mb-7 ${Icon ? "flex flex-col items-center text-center" : ""}`}>
    {Icon ? (
      <span className={`auth-card__badge mb-5 ${badge_tone_classes[tone]}`}>
        <Icon className="h-6 w-6" />
      </span>
    ) : null}
    <h1 className="auth-card__title mb-2 text-gray-800 dark:text-white/90">{title}</h1>
    <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>
  </div>
);

export const AuthAlert: React.FC<{ message: string }> = ({ message }) => (
  <div
    role="alert"
    className="mb-5 flex items-start gap-2.5 rounded-xl border border-error-200 bg-error-50 px-3.5 py-3 text-sm text-error-600 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400"
  >
    <AlertCircle className="h-4 w-4 flex-none translate-y-0.5" />
    <span>{message}</span>
  </div>
);

export const AuthDivider: React.FC<{ label?: string }> = ({ label = "Or" }) => (
  <div className="auth-divider" role="separator">
    {label}
  </div>
);

type GoogleAuthButtonProps = {
  label: string;
  onClick: () => void;
  is_loading?: boolean;
};

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ label, onClick, is_loading = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={is_loading}
    className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:ring-3 focus-visible:ring-brand-500/15 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 dark:border-shell-border-strong dark:bg-shell-bg dark:text-shell-text dark:hover:bg-shell-hover"
  >
    {is_loading ? (
      <Loader2 className="h-5 w-5 animate-spin text-gray-400 dark:text-shell-text-muted" />
    ) : (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z"
          fill="#4285F4"
        />
        <path
          d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z"
          fill="#34A853"
        />
        <path
          d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z"
          fill="#FBBC05"
        />
        <path
          d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z"
          fill="#EB4335"
        />
      </svg>
    )}
    {is_loading ? "Redirecting…" : label}
  </button>
);

/** Leading icon inside an auth input, pair it with `className="pl-11"` on the input. */
export const AuthFieldIcon: React.FC<{ icon: LucideIcon }> = ({ icon: Icon }) => (
  <Icon className="auth-field__icon text-gray-400 dark:text-shell-text-muted" aria-hidden="true" />
);

type AuthPasswordToggleProps = {
  is_visible: boolean;
  onToggle: () => void;
};

/** Show or hide button at the end of a password input, pair it with `className="pr-12"` on the input. */
export const AuthPasswordToggle: React.FC<AuthPasswordToggleProps> = ({ is_visible, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={is_visible ? "Hide password" : "Show password"}
    aria-pressed={is_visible}
    className="auth-field__toggle text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-shell-text-muted dark:hover:bg-shell-hover dark:hover:text-shell-text-secondary"
  >
    {is_visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
  </button>
);

/** Live "Passwords match" hint under a confirmation input. Renders nothing until something is typed. */
export const PasswordMatchHint: React.FC<{ password: string; confirmation: string }> = ({ password, confirmation }) => {
  if (!confirmation) return null;
  const is_match = password === confirmation;

  return (
    <p
      aria-live="polite"
      className={`mt-1.5 flex items-center gap-1.5 text-xs ${is_match ? "text-success-500" : "text-error-500"}`}
    >
      {is_match ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {is_match ? "Passwords match" : "Passwords do not match"}
    </p>
  );
};

type AuthFooterLinkProps = {
  prompt: string;
  href: string;
  label: string;
};

export const AuthFooterLink: React.FC<AuthFooterLinkProps> = ({ prompt, href, label }) => (
  <p className="mt-7 border-t border-gray-100 pt-6 text-center text-sm text-gray-500 dark:border-shell-border dark:text-gray-400">
    {prompt}{" "}
    <Link href={href} className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
      {label}
    </Link>
  </p>
);
