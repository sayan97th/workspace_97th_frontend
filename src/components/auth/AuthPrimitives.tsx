import React from "react";
import Link from "next/link";
import { AlertCircle, Check, ChevronLeft, Eye, EyeOff, Loader2, type LucideIcon, X } from "lucide-react";
import GoogleGlyph from "@/components/integrations/GoogleGlyph";

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
      <GoogleGlyph size={20} />
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
