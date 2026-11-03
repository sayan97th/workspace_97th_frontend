"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { AlertCircle, ChevronLeft, Loader2, Lock, Mail, ShieldAlert } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth.service";
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
import TwoFactorChallengeCard from "./TwoFactorChallengeCard";

// ── Main Component ────────────────────────────────────────────────────────────

type View = "credentials" | "two_factor" | "account_disabled";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_auth_failed: "Google sign-in failed. Please try again.",
  google_auth_cancelled: "Google sign-in was cancelled. Choose a Google account to continue.",
  google_auth_expired: "Your Google sign-in took too long. Please try again.",
  google_email_unverified: "Your Google email address is not verified. Verify it with Google, or sign in with your email and password.",
  google_account_mismatch: "This email is already linked to a different Google account. Sign in with that Google account, or use your email and password.",
  account_disabled: "Your account has been disabled. Please contact support.",
};

type SignInFormProps = {
  /** `callbackUrl` search param, where to go after a successful sign in. */
  callback_url: string | null;
  /** `error` search param set by the Google OAuth callback. */
  error_code: string | null;
};

export default function SignInForm({ callback_url, error_code }: SignInFormProps) {
  const { login } = useAuth();

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

  const handleBackToCredentials = () => {
    setView("credentials");
    setTwoFactorToken("");
  };

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    window.location.href = authService.getGoogleRedirectUrl({ remember: keep_logged_in, callback_url });
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
        <TwoFactorChallengeCard
          key="two_factor"
          two_factor_token={twoFactorToken}
          callback_url={callback_url}
          onBack={handleBackToCredentials}
        />
      )}
    </AuthFormContainer>
  );
}
