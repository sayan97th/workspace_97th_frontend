"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import {
  AlertCircle,
  ChevronLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { getValidRedirectUrl } from "@/utils/redirect";
import type { ApiError } from "@/types/auth";

// ── OTP Input ─────────────────────────────────────────────────────────────────

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

const OtpInput = ({ value, onChange, error }: OtpInputProps) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  const handleChange = (index: number, char: string) => {
    const clean = char.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = clean || " ";
    onChange(newDigits.join("").trimEnd());
    if (clean && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index].trim()) {
        const newDigits = [...digits];
        newDigits[index] = " ";
        onChange(newDigits.join("").trimEnd());
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i].trim()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`font-mono-accent h-14 w-12 rounded-xl border text-center text-xl font-semibold transition-all focus:outline-none focus:ring-2 ${
            error
              ? "border-error-400 bg-error-50 text-error-700 focus:border-error-500 focus:ring-error-200 dark:border-error-500 dark:bg-error-500/10 dark:text-error-400"
              : "border-gray-300 bg-white text-gray-900 focus:border-brand-500 focus:ring-brand-200 dark:border-shell-border-strong dark:bg-shell-bg dark:text-shell-text dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
          }`}
        />
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

type View = "credentials" | "two_factor" | "account_disabled";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_auth_failed: "Google sign-in failed. Please try again.",
  account_disabled: "Your account has been disabled. Please contact support.",
};

export default function SignInForm() {
  const searchParams = useSearchParams();
  const { login, loginWithTwoFactor } = useAuth();

  // ── Credentials step state ───────────────────────────────────────────────
  const [view, setView] = useState<View>("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => {
    const errParam =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("error")
        : null;
    return errParam ? (GOOGLE_ERROR_MESSAGES[errParam] ?? "An error occurred. Please try again.") : "";
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // ── 2FA step state ───────────────────────────────────────────────────────
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const result = await login({ email, password });

      if (result.requires_two_factor) {
        setTwoFactorToken(result.two_factor_token);
        setView("two_factor");
        return;
      }

      const redirectUrl = getValidRedirectUrl(searchParams.get("callbackUrl"));
      window.location.href = redirectUrl;
    } catch (err: unknown) {
      const apiError = err as ApiError;
      if (apiError.status_code === 403 || apiError.code === "account_disabled") {
        setView("account_disabled");
        return;
      }
      if (apiError.errors) {
        setFieldErrors(apiError.errors);
      }
      setError(apiError.message || "An error occurred during sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.replace(/\s/g, "");
    if (cleanCode.length < 6) {
      setOtpError("Please enter the full 6-digit code.");
      return;
    }
    setOtpError("");
    setIsVerifying(true);

    try {
      await loginWithTwoFactor(twoFactorToken, cleanCode);
      const redirectUrl = getValidRedirectUrl(searchParams.get("callbackUrl"));
      window.location.href = redirectUrl;
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setOtpError(apiError.message || "Invalid verification code. Please try again.");
      setOtpCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackToCredentials = () => {
    setView("credentials");
    setOtpCode("");
    setOtpError("");
    setTwoFactorToken("");
  };

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
    window.location.href = `${apiUrl}/api/auth/google/redirect`;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="no-scrollbar flex w-full flex-col overflow-y-auto lg:w-1/2 lg:flex-1">
      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeft className="h-5 w-5" />
          Back to dashboard
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        {/* ── Credentials step ─────────────────────────────────────────────── */}
        {view === "credentials" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-shell-border dark:bg-shell-panel sm:p-8">
            <div className="mb-6 sm:mb-8">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Sign In
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter your email and password to sign in.
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="inline-flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-shell-border-strong dark:bg-shell-bg dark:text-shell-text dark:hover:bg-shell-hover"
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400 dark:text-shell-text-muted" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                {isGoogleLoading ? "Redirecting…" : "Sign in with Google"}
              </button>

              <div className="relative py-3 sm:py-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-shell-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white p-2 text-gray-400 dark:bg-shell-panel dark:text-shell-text-muted sm:px-5 sm:py-2">Or</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
                  <AlertCircle className="h-4 w-4 flex-none translate-y-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCredentialsSubmit}>
                <div className="space-y-5">
                  <div>
                    <Label>
                      Email <span className="text-error-500">*</span>{" "}
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-shell-text-muted" />
                      <Input
                        className="pl-11"
                        placeholder="info@gmail.com"
                        type="email"
                        defaultValue={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={!!fieldErrors.email}
                        hint={fieldErrors.email?.[0]}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>
                      Password <span className="text-error-500">*</span>{" "}
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-shell-text-muted" />
                      <Input
                        className="pl-11"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        defaultValue={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={!!fieldErrors.password}
                        hint={fieldErrors.password?.[0]}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute top-1/2 right-3.5 z-10 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:text-shell-text-muted dark:hover:text-shell-text-secondary"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isChecked} onChange={setIsChecked} />
                      <span className="block text-sm font-normal text-gray-700 dark:text-gray-400">
                        Keep me logged in
                      </span>
                    </div>
                    <Link
                      href="/reset-password"
                      className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div>
                    <Button className="w-full" size="sm" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing in…
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                  </div>
                </div>
              </form>

              <div className="mt-6">
                <p className="text-center text-sm font-normal text-gray-700 dark:text-gray-400">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
                    Sign Up
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Account disabled step ────────────────────────────────────────── */}
        {view === "account_disabled" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-shell-border dark:bg-shell-panel sm:p-8">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-error-100 dark:bg-error-500/15">
                <ShieldAlert className="h-8 w-8 text-error-500 dark:text-error-400" />
              </div>
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Account Disabled
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your account has been suspended and you no longer have access to this platform.
              </p>
            </div>

            <div className="mb-6 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/20 dark:bg-error-500/10">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 flex-none text-error-500 dark:text-error-400" />
                <div className="space-y-1 text-sm text-error-700 dark:text-error-300">
                  <p className="font-medium">Why was my account disabled?</p>
                  <ul className="space-y-0.5 text-error-600 dark:text-error-400">
                    <li>• Violation of our Terms of Service or Acceptable Use Policy</li>
                    <li>• Suspicious or unauthorized activity detected</li>
                    <li>• Administrative decision by our team</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-shell-border dark:bg-shell-bg">
              <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                Think this is a mistake?
              </p>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                If you believe your account was disabled in error, please reach out to our support team. We
                will review your case and get back to you as soon as possible.
              </p>
              <a
                href="mailto:support@97thfloor.com"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                <Mail className="h-4 w-4" />
                Contact Support
              </a>
            </div>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setView("credentials")}
                className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <ChevronLeft className="h-4 w-4" />
                Use a different account
              </button>
            </div>
          </div>
        )}

        {/* ── Two-factor step ───────────────────────────────────────────────── */}
        {view === "two_factor" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-shell-border dark:bg-shell-panel sm:p-8">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10">
                <ShieldCheck className="h-8 w-8 text-brand-600 dark:text-brand-400" />
              </div>
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Two-Factor Authentication
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter the 6-digit code from your authenticator app to continue.
              </p>
            </div>

            <form onSubmit={handleTwoFactorSubmit}>
              <div className="space-y-6">
                <div className="space-y-3">
                  <OtpInput value={otpCode} onChange={setOtpCode} error={!!otpError} />
                  {otpError && (
                    <p className="flex items-center justify-center gap-1.5 text-sm text-error-600 dark:text-error-400">
                      <AlertCircle className="h-4 w-4 flex-none" />
                      {otpError}
                    </p>
                  )}
                  <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                    The code refreshes every 30 seconds.
                  </p>
                </div>

                <Button
                  className="w-full"
                  size="sm"
                  disabled={isVerifying || otpCode.replace(/\s/g, "").length < 6}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleBackToCredentials}
                className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <ChevronLeft className="h-4 w-4" />
                Use a different account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
