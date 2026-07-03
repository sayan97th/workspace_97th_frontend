"use client";

import React, { useState, useEffect, useRef } from "react";
import Button from "@/components/ui/button/Button";
import { twoFactorService } from "@/services/two-factor.service";
import type { ApiError } from "@/types/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

type SetupView = "status" | "setup_qr" | "setup_verify" | "recovery_codes" | "disable_confirm";

// ── OTP Input ─────────────────────────────────────────────────────────────────

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

const OtpInput = ({ value, onChange, error }: OtpInputProps) => {
  const inputs_ref = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  const handleChange = (index: number, char: string) => {
    const clean = char.replace(/\D/g, "").slice(-1);
    const new_digits = [...digits];
    new_digits[index] = clean || " ";
    onChange(new_digits.join("").trimEnd());
    if (clean && index < 5) {
      inputs_ref.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index].trim()) {
        const new_digits = [...digits];
        new_digits[index] = " ";
        onChange(new_digits.join("").trimEnd());
      } else if (index > 0) {
        inputs_ref.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) inputs_ref.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) inputs_ref.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    const focus_index = Math.min(pasted.length, 5);
    inputs_ref.current[focus_index]?.focus();
  };

  return (
    <div className="flex gap-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => { inputs_ref.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i].trim()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`h-12 w-10 rounded-xl border text-center text-lg font-semibold transition-all focus:outline-none focus:ring-2 sm:w-12 ${
            error
              ? "border-error-400 bg-error-50 text-error-700 focus:border-error-500 focus:ring-error-200 dark:border-error-500 dark:bg-error-500/10 dark:text-error-400 dark:focus:ring-error-500/20"
              : "border-gray-300 bg-white text-gray-900 focus:border-brand-500 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
          }`}
        />
      ))}
    </div>
  );
};

// ── Recovery Code Item ────────────────────────────────────────────────────────

const RecoveryCodeItem = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Click to copy"
      className="group flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 transition-all hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:border-brand-600 dark:hover:bg-brand-500/10"
    >
      <span>{code}</span>
      {copied ? (
        <svg className="h-3.5 w-3.5 shrink-0 text-success-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
        </svg>
      )}
    </button>
  );
};

// ── Step Indicator ────────────────────────────────────────────────────────────

interface StepIndicatorProps {
  current: 1 | 2;
}

const StepIndicator = ({ current }: StepIndicatorProps) => (
  <div className="flex items-center gap-2">
    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${current > 1 ? "bg-success-500 text-white" : "bg-brand-500 text-white"}`}>
      {current > 1 ? (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : "1"}
    </div>
    <div className={`h-px flex-1 transition-colors ${current > 1 ? "bg-brand-400 dark:bg-brand-600" : "bg-gray-200 dark:bg-gray-700"}`} />
    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${current === 2 ? "bg-brand-500 text-white" : "border border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500"}`}>
      2
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

export default function TwoFactorSection() {
  const [view, setView] = useState<SetupView>("status");
  const [is_enabled, setIsEnabled] = useState(false);
  const [is_loading_status, setIsLoadingStatus] = useState(true);
  const [enabled_at, setEnabledAt] = useState<string | null>(null);

  // Setup state
  const [qr_svg, setQrSvg] = useState<string | null>(null);
  const [secret_key, setSecretKey] = useState<string | null>(null);
  const [show_secret, setShowSecret] = useState(false);
  const [is_loading_qr, setIsLoadingQr] = useState(false);
  const [secret_copied, setSecretCopied] = useState(false);

  // Verify state
  const [otp_code, setOtpCode] = useState("");
  const [is_verifying, setIsVerifying] = useState(false);
  const [verify_error, setVerifyError] = useState<string | null>(null);

  // Recovery codes
  const [recovery_codes, setRecoveryCodes] = useState<string[]>([]);
  const [all_copied, setAllCopied] = useState(false);

  // Disable state — this API confirms with the account password.
  const [disable_password, setDisablePassword] = useState("");
  const [is_disabling, setIsDisabling] = useState(false);
  const [disable_error, setDisableError] = useState<string | null>(null);

  // General API error
  const [api_error, setApiError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await twoFactorService.getStatus();
      setIsEnabled(response.enabled);
      setEnabledAt(response.confirmed_at ?? null);
    } catch {
      // Fail silently — assume disabled
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleStartSetup = async () => {
    setApiError(null);
    setIsLoadingQr(true);
    setView("setup_qr");
    try {
      const response = await twoFactorService.initSetup();
      setQrSvg(response.svg);
      setSecretKey(response.secret);
    } catch (err: unknown) {
      const api_err = err as ApiError;
      setApiError(api_err.message || "Failed to start 2FA setup. Please try again.");
      setView("status");
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleVerify = async () => {
    if (otp_code.replace(/\s/g, "").length < 6) {
      setVerifyError("Please enter the full 6-digit code.");
      return;
    }
    setVerifyError(null);
    setIsVerifying(true);
    try {
      const response = await twoFactorService.confirm({ code: otp_code.replace(/\s/g, "") });
      setRecoveryCodes(response.recovery_codes);
      setIsEnabled(true);
      setView("recovery_codes");
    } catch (err: unknown) {
      const api_err = err as ApiError;
      setVerifyError(api_err.message || "Invalid verification code. Please try again.");
    } finally {
      setIsVerifying(false);
      setOtpCode("");
    }
  };

  const handleDisable = async () => {
    if (!disable_password) {
      setDisableError("Please enter your account password to confirm.");
      return;
    }
    setDisableError(null);
    setIsDisabling(true);
    try {
      await twoFactorService.disable({ password: disable_password });
      setIsEnabled(false);
      setEnabledAt(null);
      setView("status");
      setDisablePassword("");
    } catch (err: unknown) {
      const api_err = err as ApiError;
      setDisableError(
        api_err.errors?.password?.[0] ||
          api_err.message ||
          "Incorrect password. Please try again."
      );
    } finally {
      setIsDisabling(false);
    }
  };

  const handleCancelSetup = () => {
    setView("status");
    setOtpCode("");
    setQrSvg(null);
    setSecretKey(null);
    setVerifyError(null);
    setShowSecret(false);
  };

  const handleCancelDisable = () => {
    setView("status");
    setDisablePassword("");
    setDisableError(null);
  };

  const handleDoneRecovery = () => {
    setView("status");
    setRecoveryCodes([]);
    setQrSvg(null);
    setSecretKey(null);
  };

  const copyAllRecoveryCodes = () => {
    navigator.clipboard.writeText(recovery_codes.join("\n"));
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  const copySecret = () => {
    if (!secret_key) return;
    navigator.clipboard.writeText(secret_key);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (is_loading_status) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-5 w-48 rounded-md bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="h-4 w-72 rounded-md bg-gray-100 dark:bg-gray-800" />
          <div className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex items-center gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${is_enabled ? "bg-success-50 dark:bg-success-500/10" : "bg-brand-50 dark:bg-brand-500/10"}`}>
          <svg
            className={`h-4 w-4 ${is_enabled ? "text-success-600 dark:text-success-400" : "text-brand-600 dark:text-brand-400"}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            {is_enabled ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.764c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
            )}
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Two-Factor Authentication
            </h2>
            {is_enabled ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
                <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
                Not enabled
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {is_enabled
              ? "Your account is protected with an extra layer of security."
              : "Protect your account with a verification code at each login."}
          </p>
        </div>
      </div>

      {/* ── General API error ─────────────────────────────────────────────── */}
      {api_error && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 dark:border-error-500/20 dark:bg-error-500/10">
          <svg className="h-4 w-4 shrink-0 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-error-600 dark:text-error-400">{api_error}</p>
        </div>
      )}

      {/* ── Status view ───────────────────────────────────────────────────── */}
      {view === "status" && (
        <>
          {is_enabled ? (
            <div className="space-y-4">
              {/* Enabled banner */}
              <div className="flex items-start gap-3 rounded-xl border border-success-200 bg-success-50 p-4 dark:border-success-500/20 dark:bg-success-500/10">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-success-600 dark:text-success-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-success-800 dark:text-success-300">
                    Your account is protected
                  </p>
                  <p className="mt-0.5 text-xs text-success-600 dark:text-success-400">
                    A verification code will be required every time you sign in.
                    {enabled_at && (
                      <span className="ml-1">
                        Enabled on {new Date(enabled_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Disabling 2FA will reduce your account security.
                </p>
                <Button variant="outline" size="sm" onClick={() => setView("disable_confirm")}>
                  Disable 2FA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add an extra layer of security to your account. When enabled, you&apos;ll need your password
                and a time-based verification code from your authenticator app to sign in.
              </p>

              {/* Benefits */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  {
                    icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
                    label: "Stronger security",
                  },
                  {
                    icon: "M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                    label: "Block unauthorized access",
                  },
                  {
                    icon: "M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z",
                    label: "Unique per-login codes",
                  },
                ].map((benefit) => (
                  <div
                    key={benefit.label}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800/50"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-100 dark:bg-brand-500/20">
                      <svg className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d={benefit.icon} />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{benefit.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Requires Google Authenticator, Authy, or similar.
                </p>
                <Button variant="primary" size="sm" onClick={handleStartSetup}>
                  Set Up 2FA
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Setup: Scan QR Code ───────────────────────────────────────────── */}
      {view === "setup_qr" && (
        <div className="space-y-5">
          <StepIndicator current={1} />

          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Scan the QR code</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Open your authenticator app and scan the QR code below to add your account.
            </p>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {/* QR code */}
            <div className="flex h-40 w-40 shrink-0 items-center justify-center self-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800/50 sm:self-auto">
              {is_loading_qr ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
                  <span className="text-xs text-gray-400">Loading…</span>
                </div>
              ) : qr_svg ? (
                <div
                  className="flex h-full w-full items-center justify-center [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: qr_svg }}
                />
              ) : null}
            </div>

            {/* Instructions */}
            <div className="flex-1 space-y-3">
              <ol className="space-y-2.5">
                {[
                  "Install an authenticator app on your phone (Google Authenticator, Authy, 1Password, etc.).",
                  <React.Fragment key="add-account">Tap the <strong className="font-semibold text-gray-700 dark:text-gray-300">+</strong> or <strong className="font-semibold text-gray-700 dark:text-gray-300">Add account</strong> option in the app.</React.Fragment>,
                  "Point your camera at the QR code, or enter the setup key manually below.",
                ].map((step, index) => (
                  <li key={index} className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {index + 1}
                    </span>
                    <span className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{step}</span>
                  </li>
                ))}
              </ol>

              {/* Manual entry key */}
              {secret_key && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={show_secret
                        ? "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        : "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      } />
                    </svg>
                    {show_secret ? "Hide" : "Show"} manual setup key
                  </button>

                  {show_secret && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
                      <code className="flex-1 break-all font-mono text-xs tracking-wider text-gray-700 dark:text-gray-300">
                        {secret_key}
                      </code>
                      <button
                        type="button"
                        onClick={copySecret}
                        title="Copy key"
                        className="shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {secret_copied ? (
                          <svg className="h-3.5 w-3.5 text-success-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={handleCancelSetup}
              className="text-xs text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Cancel
            </button>
            <Button
              variant="primary"
              size="sm"
              disabled={is_loading_qr}
              onClick={() => setView("setup_verify")}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* ── Setup: Verify OTP ─────────────────────────────────────────────── */}
      {view === "setup_verify" && (
        <div className="space-y-5">
          <StepIndicator current={2} />

          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Verify your authenticator</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter the 6-digit code shown in your authenticator app to confirm the setup.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2.5 py-2">
            <OtpInput value={otp_code} onChange={setOtpCode} error={!!verify_error} />
            {verify_error && (
              <p className="flex items-center gap-1.5 text-xs text-error-600 dark:text-error-400">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {verify_error}
              </p>
            )}
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              The code refreshes every 30 seconds.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={() => { setView("setup_qr"); setOtpCode(""); setVerifyError(null); }}
              className="text-xs text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              ← Back
            </button>
            <Button
              variant="primary"
              size="sm"
              disabled={is_verifying || otp_code.replace(/\s/g, "").length < 6}
              onClick={handleVerify}
            >
              {is_verifying ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Verifying…
                </span>
              ) : "Verify & Enable"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Recovery Codes ────────────────────────────────────────────────── */}
      {view === "recovery_codes" && (
        <div className="space-y-4">
          {/* Success */}
          <div className="flex items-center gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-3 dark:border-success-500/20 dark:bg-success-500/10">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-500 text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <p className="text-sm font-medium text-success-700 dark:text-success-400">
              Two-factor authentication is now active!
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/20 dark:bg-warning-500/10">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-warning-700 dark:text-warning-400">Save your recovery codes now</p>
              <p className="mt-0.5 text-xs leading-relaxed text-warning-600 dark:text-warning-400/80">
                If you lose access to your authenticator app, these codes are the only way to recover your account. Each code can only be used once.
              </p>
            </div>
          </div>

          {/* Codes grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {recovery_codes.map((code) => (
              <RecoveryCodeItem key={code} code={code} />
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={copyAllRecoveryCodes}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              {all_copied ? (
                <>
                  <svg className="h-3.5 w-3.5 text-success-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  Copy all codes
                </>
              )}
            </button>
            <Button variant="primary" size="sm" onClick={handleDoneRecovery}>
              Done
            </Button>
          </div>
        </div>
      )}

      {/* ── Disable Confirmation ──────────────────────────────────────────── */}
      {view === "disable_confirm" && (
        <div className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/20 dark:bg-error-500/10">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-error-700 dark:text-error-400">This will reduce your account security</p>
              <p className="mt-0.5 text-xs leading-relaxed text-error-600 dark:text-error-400/80">
                Without 2FA, anyone who obtains your password can access your account without any additional verification.
              </p>
            </div>
          </div>

          {/* Password confirmation */}
          <div className="space-y-2">
            <label htmlFor="disable_2fa_password" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Enter your account password to confirm
            </label>
            <input
              id="disable_2fa_password"
              type="password"
              value={disable_password}
              placeholder="Your account password"
              autoComplete="current-password"
              onChange={(e) => {
                setDisablePassword(e.target.value);
                if (disable_error) setDisableError(null);
              }}
              className={`h-11 w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs transition-all focus:outline-none focus:ring-3 dark:bg-gray-900 dark:text-white/90 ${
                disable_error
                  ? "border-error-400 focus:border-error-500 focus:ring-error-500/10 dark:border-error-500"
                  : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800"
              }`}
            />
            {disable_error && (
              <p className="flex items-center gap-1.5 text-xs text-error-600 dark:text-error-400">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {disable_error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={handleCancelDisable}
              className="text-xs text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDisable}
              disabled={is_disabling || !disable_password}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-error-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {is_disabling ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Disabling…
                </span>
              ) : "Confirm & Disable"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
