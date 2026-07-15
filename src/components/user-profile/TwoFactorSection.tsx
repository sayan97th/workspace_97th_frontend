"use client";

import React, { useState, useEffect, useRef } from "react";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileSectionHeader from "@/components/profile/ProfileSectionHeader";
import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileFieldError from "@/components/profile/ProfileFieldError";
import {
  inputClass,
  primaryButtonClass,
  outlineButtonClass,
  dangerButtonClass,
} from "@/components/profile/profileStyles";
import {
  ShieldIcon,
  PermissionsIcon,
  KeyIcon,
  EyeIcon,
  EyeOffIcon,
  DuplicateIcon,
  CheckIcon,
  ChevronRightIcon,
} from "@/icons/workspace-icons";
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
          className={`h-12 w-10 rounded-xl border bg-shell-bg text-center text-lg font-semibold outline-none transition-all focus:ring-2 sm:w-12 ${
            error
              ? "border-[#e2445c] text-[#ff8a94] focus:border-[#e2445c] focus:ring-[#e2445c]/20"
              : "border-shell-border-strong text-shell-text focus:border-brand-500 focus:ring-brand-500/20"
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
      className="group flex items-center justify-between rounded-lg border border-shell-border-strong bg-shell-bg px-3 py-2 font-mono text-xs text-shell-text-secondary transition-all hover:border-brand-500/40 hover:bg-brand-500/[0.06]"
    >
      <span>{code}</span>
      {copied ? (
        <CheckIcon size={13} className="flex-none text-success-500" />
      ) : (
        <DuplicateIcon size={13} className="flex-none text-shell-text-faint opacity-0 transition-opacity group-hover:opacity-100" />
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
      {current > 1 ? <CheckIcon size={13} /> : "1"}
    </div>
    <div className={`h-px flex-1 transition-colors ${current > 1 ? "bg-brand-500/40" : "bg-shell-border-strong"}`} />
    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${current === 2 ? "bg-brand-500 text-white" : "border border-shell-border-strong text-shell-text-faint"}`}>
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
      <ProfileCard>
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-shell-hover-strong" />
            <div className="h-5 w-48 rounded-md bg-shell-hover-strong" />
          </div>
          <div className="h-4 w-72 rounded-md bg-shell-hover" />
          <div className="h-20 rounded-xl bg-shell-hover" />
        </div>
      </ProfileCard>
    );
  }

  return (
    <ProfileCard>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <ProfileSectionHeader
        icon={<ShieldIcon size={16} checked={is_enabled} />}
        tone={is_enabled ? "success" : "brand"}
        title="Two-Factor Authentication"
        description={
          is_enabled
            ? "Your account is protected with an extra layer of security."
            : "Protect your account with a verification code at each login."
        }
        badge={
          is_enabled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#6fcf97]/[0.14] px-2 py-0.5 text-xs font-medium text-[#6fcf97]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6fcf97]" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-shell-hover px-2 py-0.5 text-xs font-medium text-shell-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-shell-text-faint" />
              Not enabled
            </span>
          )
        }
      />

      {/* ── General API error ─────────────────────────────────────────────── */}
      {api_error && (
        <ProfileBanner tone="error" className="mb-4">
          {api_error}
        </ProfileBanner>
      )}

      {/* ── Status view ───────────────────────────────────────────────────── */}
      {view === "status" && (
        <>
          {is_enabled ? (
            <div className="space-y-4">
              <ProfileBanner tone="success" title="Your account is protected">
                A verification code will be required every time you sign in.
                {enabled_at && (
                  <span className="ml-1">
                    Enabled on {new Date(enabled_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
                  </span>
                )}
              </ProfileBanner>

              <div className="flex items-center justify-between border-t border-shell-border pt-4">
                <p className="text-xs text-shell-text-faint">
                  Disabling 2FA will reduce your account security.
                </p>
                <button type="button" onClick={() => setView("disable_confirm")} className={outlineButtonClass}>
                  Disable 2FA
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-shell-text-muted">
                Add an extra layer of security to your account. When enabled, you&apos;ll need your password
                and a time-based verification code from your authenticator app to sign in.
              </p>

              {/* Benefits */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { icon: <PermissionsIcon size={14} />, label: "Stronger security" },
                  { icon: <ShieldIcon size={14} />, label: "Block unauthorized access" },
                  { icon: <KeyIcon size={14} />, label: "Unique per-login codes" },
                ].map((benefit) => (
                  <div
                    key={benefit.label}
                    className="flex items-center gap-2 rounded-lg bg-shell-hover px-3 py-2.5"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-500/[0.14] text-brand-500">
                      {benefit.icon}
                    </div>
                    <span className="text-xs font-medium text-shell-text-secondary">{benefit.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-shell-border pt-4">
                <p className="text-xs text-shell-text-faint">
                  Requires Google Authenticator, Authy, or similar.
                </p>
                <button type="button" onClick={handleStartSetup} className={primaryButtonClass}>
                  Set Up 2FA
                </button>
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
            <h3 className="text-sm font-semibold text-shell-text">Scan the QR code</h3>
            <p className="mt-1 text-xs text-shell-text-muted">
              Open your authenticator app and scan the QR code below to add your account.
            </p>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {/* QR code */}
            <div className="flex h-40 w-40 shrink-0 items-center justify-center self-center rounded-2xl border-2 border-dashed border-shell-border-strong bg-shell-bg p-2 sm:self-auto">
              {is_loading_qr ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-shell-border-strong border-t-brand-500" />
                  <span className="text-xs text-shell-text-faint">Loading…</span>
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
                  <React.Fragment key="add-account">Tap the <strong className="font-semibold text-shell-text-secondary">+</strong> or <strong className="font-semibold text-shell-text-secondary">Add account</strong> option in the app.</React.Fragment>,
                  "Point your camera at the QR code, or enter the setup key manually below.",
                ].map((step, index) => (
                  <li key={index} className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-shell-hover text-[10px] font-bold text-shell-text-muted">
                      {index + 1}
                    </span>
                    <span className="text-xs leading-relaxed text-shell-text-muted">{step}</span>
                  </li>
                ))}
              </ol>

              {/* Manual entry key */}
              {secret_key && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-500 transition-colors hover:text-brand-600"
                  >
                    {show_secret ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                    {show_secret ? "Hide" : "Show"} manual setup key
                  </button>

                  {show_secret && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-shell-border-strong bg-shell-hover px-3 py-2">
                      <code className="flex-1 break-all font-mono text-xs tracking-wider text-shell-text-secondary">
                        {secret_key}
                      </code>
                      <button
                        type="button"
                        onClick={copySecret}
                        title="Copy key"
                        className="shrink-0 text-shell-text-faint transition-colors hover:text-shell-text-secondary"
                      >
                        {secret_copied ? (
                          <CheckIcon size={13} className="text-success-500" />
                        ) : (
                          <DuplicateIcon size={13} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-shell-border pt-4">
            <button
              type="button"
              onClick={handleCancelSetup}
              className="text-xs text-shell-text-muted transition-colors hover:text-shell-text-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={is_loading_qr}
              onClick={() => setView("setup_verify")}
              className={primaryButtonClass}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── Setup: Verify OTP ─────────────────────────────────────────────── */}
      {view === "setup_verify" && (
        <div className="space-y-5">
          <StepIndicator current={2} />

          <div>
            <h3 className="text-sm font-semibold text-shell-text">Verify your authenticator</h3>
            <p className="mt-1 text-xs text-shell-text-muted">
              Enter the 6-digit code shown in your authenticator app to confirm the setup.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2.5 py-2">
            <OtpInput value={otp_code} onChange={setOtpCode} error={!!verify_error} />
            {verify_error && <ProfileFieldError message={verify_error} />}
            <p className="text-[11px] text-shell-text-faint">
              The code refreshes every 30 seconds.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-shell-border pt-4">
            <button
              type="button"
              onClick={() => { setView("setup_qr"); setOtpCode(""); setVerifyError(null); }}
              className="flex items-center gap-1 text-xs text-shell-text-muted transition-colors hover:text-shell-text-secondary"
            >
              <ChevronRightIcon size={10} className="rotate-180" />
              Back
            </button>
            <button
              type="button"
              disabled={is_verifying || otp_code.replace(/\s/g, "").length < 6}
              onClick={handleVerify}
              className={primaryButtonClass}
            >
              {is_verifying ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Verifying…
                </span>
              ) : "Verify & Enable"}
            </button>
          </div>
        </div>
      )}

      {/* ── Recovery Codes ────────────────────────────────────────────────── */}
      {view === "recovery_codes" && (
        <div className="space-y-4">
          <ProfileBanner tone="success">
            Two-factor authentication is now active!
          </ProfileBanner>

          <ProfileBanner tone="warning" title="Save your recovery codes now">
            If you lose access to your authenticator app, these codes are the only way to recover your account. Each code can only be used once.
          </ProfileBanner>

          {/* Codes grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {recovery_codes.map((code) => (
              <RecoveryCodeItem key={code} code={code} />
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-shell-border pt-4">
            <button
              type="button"
              onClick={copyAllRecoveryCodes}
              className="flex items-center gap-1.5 text-xs font-medium text-shell-text-muted transition-colors hover:text-shell-text-secondary"
            >
              {all_copied ? (
                <>
                  <CheckIcon size={13} className="text-success-500" />
                  Copied!
                </>
              ) : (
                <>
                  <DuplicateIcon size={13} />
                  Copy all codes
                </>
              )}
            </button>
            <button type="button" onClick={handleDoneRecovery} className={primaryButtonClass}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Disable Confirmation ──────────────────────────────────────────── */}
      {view === "disable_confirm" && (
        <div className="space-y-4">
          <ProfileBanner tone="error" title="This will reduce your account security">
            Without 2FA, anyone who obtains your password can access your account without any additional verification.
          </ProfileBanner>

          {/* Password confirmation */}
          <div className="space-y-2">
            <label htmlFor="disable_2fa_password" className="text-xs font-medium text-shell-text-secondary">
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
              className={inputClass(!!disable_error)}
            />
            {disable_error && <ProfileFieldError message={disable_error} />}
          </div>

          <div className="flex items-center justify-between border-t border-shell-border pt-4">
            <button
              type="button"
              onClick={handleCancelDisable}
              className="text-xs text-shell-text-muted transition-colors hover:text-shell-text-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDisable}
              disabled={is_disabling || !disable_password}
              className={dangerButtonClass}
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
    </ProfileCard>
  );
}
