"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { AlertCircle, ChevronLeft, Loader2, Lock, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { getValidRedirectUrl } from "@/utils/redirect";
import type { ApiError } from "@/types/auth";
import {
  AuthAlert,
  AuthCard,
  AuthCardHeader,
  AuthDivider,
  AuthFieldIcon,
  AuthFooterLink,
  AuthFormContainer,
  AuthPasswordToggle,
  GoogleAuthButton,
} from "./AuthPrimitives";

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
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of 6`}
          maxLength={1}
          value={digits[i].trim()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`font-mono-accent h-14 w-11 rounded-xl sm:w-12 border text-center text-xl font-semibold transition-all focus:outline-none focus:ring-2 ${
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

type SignInFormProps = {
  /** `callbackUrl` search param, where to go after a successful sign in. */
  callback_url: string | null;
  /** `error` search param set by the Google OAuth callback. */
  error_code: string | null;
};

export default function SignInForm({ callback_url, error_code }: SignInFormProps) {
  const { login, loginWithTwoFactor } = useAuth();

  // ── Credentials step state ───────────────────────────────────────────────
  const [view, setView] = useState<View>("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [keep_logged_in, setKeepLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() =>
    error_code ? (GOOGLE_ERROR_MESSAGES[error_code] ?? "An error occurred. Please try again.") : ""
  );
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
      const result = await login({ email, password, remember: keep_logged_in });

      if (result.requires_two_factor) {
        setTwoFactorToken(result.two_factor_token);
        setView("two_factor");
        return;
      }

      window.location.href = getValidRedirectUrl(callback_url);
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
      window.location.href = getValidRedirectUrl(callback_url);
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
    const remember_query = keep_logged_in ? "?remember=1" : "";
    window.location.href = `${apiUrl}/api/auth/google/redirect${remember_query}`;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AuthFormContainer back_link={{ href: "/", label: "Back to dashboard" }}>
      {/* ── Credentials step ─────────────────────────────────────────────── */}
      {view === "credentials" && (
        <AuthCard key="credentials">
          <AuthCardHeader title="Welcome back" description="Sign in to your workspace to pick up where you left off." />

          <GoogleAuthButton label="Sign in with Google" onClick={handleGoogleSignIn} is_loading={isGoogleLoading} />

          <AuthDivider label="Or sign in with email" />

          {error && <AuthAlert message={error} />}

          <form onSubmit={handleCredentialsSubmit}>
            <div className="space-y-5">
              <div>
                <Label htmlFor="email">
                  Email <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <AuthFieldIcon icon={Mail} />
                  <Input
                    id="email"
                    name="email"
                    className="pl-11"
                    placeholder="you@company.com"
                    type="email"
                    autoComplete="email"
                    defaultValue={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!fieldErrors.email}
                    hint={fieldErrors.email?.[0]}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label htmlFor="password" className="mb-0">
                    Password <span className="text-error-500">*</span>
                  </Label>
                  <Link
                    href="/reset-password"
                    className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <AuthFieldIcon icon={Lock} />
                  <Input
                    id="password"
                    name="password"
                    className="pr-12 pl-11"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    defaultValue={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={!!fieldErrors.password}
                    hint={fieldErrors.password?.[0]}
                  />
                  <AuthPasswordToggle is_visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="keep_logged_in" checked={keep_logged_in} onChange={setKeepLoggedIn} />
                <label
                  htmlFor="keep_logged_in"
                  title="Stay signed in on this device for 30 days instead of 1 day"
                  className="block cursor-pointer text-sm font-normal text-gray-700 select-none dark:text-gray-400"
                >
                  Keep me logged in
                </label>
              </div>
              <Button className="h-11 w-full" size="sm" disabled={isSubmitting}>
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
          </form>

          <AuthFooterLink prompt="Don't have an account?" href="/signup" label="Create an account" />
        </AuthCard>
      )}

      {/* ── Account disabled step ────────────────────────────────────────── */}
      {view === "account_disabled" && (
        <AuthCard key="account_disabled">
          <AuthCardHeader
            icon={ShieldAlert}
            tone="error"
            title="Account disabled"
            description="Your account has been suspended and you no longer have access to this platform."
          />

          <div className="mb-5 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/20 dark:bg-error-500/10">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 flex-none text-error-500 dark:text-error-400" />
              <div className="space-y-1 text-sm text-error-700 dark:text-error-300">
                <p className="font-medium">Why was my account disabled?</p>
                <ul className="list-disc space-y-0.5 pl-4 text-error-600 dark:text-error-400">
                  <li>Violation of our Terms of Service or Acceptable Use Policy</li>
                  <li>Suspicious or unauthorized activity detected</li>
                  <li>Administrative decision by our team</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-shell-border dark:bg-shell-bg">
            <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Think this is a mistake?</p>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              If you believe your account was disabled in error, please reach out to our support team. We will
              review your case and get back to you as soon as possible.
            </p>
            <a
              href="mailto:support@97thfloor.com"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </a>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setView("credentials")}
              className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
              Use a different account
            </button>
          </div>
        </AuthCard>
      )}

      {/* ── Two-factor step ───────────────────────────────────────────────── */}
      {view === "two_factor" && (
        <AuthCard key="two_factor">
          <AuthCardHeader
            icon={ShieldCheck}
            title="Two-factor authentication"
            description="Enter the 6-digit code from your authenticator app, or the one we just emailed you."
          />

          <form onSubmit={handleTwoFactorSubmit}>
            <div className="space-y-6">
              <div className="space-y-3">
                <OtpInput value={otpCode} onChange={setOtpCode} error={!!otpError} />
                {otpError && (
                  <p
                    role="alert"
                    className="flex items-center justify-center gap-1.5 text-sm text-error-600 dark:text-error-400"
                  >
                    <AlertCircle className="h-4 w-4 flex-none" />
                    {otpError}
                  </p>
                )}
                <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                  Didn&apos;t get an email? Check your spam folder, or use your authenticator app instead.
                </p>
              </div>

              <Button
                className="h-11 w-full"
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
        </AuthCard>
      )}
    </AuthFormContainer>
  );
}
