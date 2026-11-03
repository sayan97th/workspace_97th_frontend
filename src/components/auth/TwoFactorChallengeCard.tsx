"use client";

import Button from "@/components/ui/button/Button";
import { AlertCircle, ChevronLeft, Loader2, ShieldCheck } from "lucide-react";
import React, { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getValidRedirectUrl } from "@/utils/redirect";
import type { ApiError } from "@/types/auth";
import { AuthCard, AuthCardHeader } from "./AuthPrimitives";

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

// ── Two factor challenge card ─────────────────────────────────────────────────

type TwoFactorChallengeCardProps = {
  /** Pending login token returned by the API when the account has 2FA turned on. */
  two_factor_token: string;
  /** Where to go once the code is accepted, validated with `getValidRedirectUrl`. */
  callback_url: string | null;
  /** Called by the "Use a different account" link. */
  onBack: () => void;
};

/**
 * Second step of a sign in for accounts with two factor authentication, shared
 * by the email and password form and the Google sign in callback.
 */
export default function TwoFactorChallengeCard({ two_factor_token, callback_url, onBack }: TwoFactorChallengeCardProps) {
  const { loginWithTwoFactor } = useAuth();
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

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
      await loginWithTwoFactor(two_factor_token, cleanCode);
      window.location.href = getValidRedirectUrl(callback_url);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setOtpError(apiError.message || "Invalid verification code. Please try again.");
      setOtpCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AuthCard>
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
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Use a different account
        </button>
      </div>
    </AuthCard>
  );
}
