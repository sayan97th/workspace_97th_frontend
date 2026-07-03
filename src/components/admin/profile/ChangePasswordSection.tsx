"use client";

import React, { useState, useCallback } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { profileService } from "@/services/profile.service";
import type { ApiError } from "@/types/auth";

// ── Password strength ─────────────────────────────────────────────────────────

interface PasswordStrength {
  score: number; // 0–4
  label: string;
  color: string;
  bar_color: string;
}

function evaluateStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "", color: "", bar_color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Clamp to 4
  score = Math.min(score, 4);

  const levels: PasswordStrength[] = [
    { score: 0, label: "", color: "", bar_color: "" },
    { score: 1, label: "Weak", color: "text-error-600 dark:text-error-400", bar_color: "bg-error-500" },
    { score: 2, label: "Fair", color: "text-warning-600 dark:text-warning-400", bar_color: "bg-warning-500" },
    { score: 3, label: "Good", color: "text-blue-600 dark:text-blue-400", bar_color: "bg-blue-500" },
    { score: 4, label: "Strong", color: "text-success-600 dark:text-success-400", bar_color: "bg-success-500" },
  ];

  return levels[score];
}

interface Requirement {
  label: string;
  met: boolean;
}

function getRequirements(password: string): Requirement[] {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Uppercase & lowercase letters", met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "At least one number", met: /[0-9]/.test(password) },
    { label: "At least one special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

// ── Eye toggle button ─────────────────────────────────────────────────────────

interface EyeButtonProps {
  visible: boolean;
  onToggle: () => void;
}

const EyeButton = ({ visible, onToggle }: EyeButtonProps) => (
  <button
    type="button"
    onClick={onToggle}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
    tabIndex={-1}
  >
    {visible ? (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    ) : (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )}
  </button>
);

// ── Field error helper ────────────────────────────────────────────────────────

interface FieldErrorProps {
  message: string;
}

const FieldError = ({ message }: FieldErrorProps) => (
  <p className="mt-1.5 flex items-center gap-1 text-xs text-error-600 dark:text-error-400">
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
    {message}
  </p>
);

// ── Main Component ────────────────────────────────────────────────────────────

export default function ChangePasswordSection() {
  const [current_password, setCurrentPassword] = useState("");
  const [new_password, setNewPassword] = useState("");
  const [confirm_password, setConfirmPassword] = useState("");

  const [show_current, setShowCurrent] = useState(false);
  const [show_new, setShowNew] = useState(false);
  const [show_confirm, setShowConfirm] = useState(false);

  const [is_saving, setIsSaving] = useState(false);
  const [success_message, setSuccessMessage] = useState<string | null>(null);
  const [api_error, setApiError] = useState<string | null>(null);
  const [field_errors, setFieldErrors] = useState<Record<string, string>>({});

  const strength = evaluateStrength(new_password);
  const requirements = getRequirements(new_password);
  const passwords_match = confirm_password.length > 0 && new_password === confirm_password;
  const passwords_mismatch = confirm_password.length > 0 && new_password !== confirm_password;

  const resetForm = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setFieldErrors({});
    setApiError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    // Client-side validation
    const client_errors: Record<string, string> = {};
    if (!current_password) client_errors.current_password = "Current password is required.";
    if (!new_password) client_errors.password = "New password is required.";
    if (strength.score < 2) client_errors.password = "Password is too weak. Make it stronger.";
    if (!confirm_password) client_errors.password_confirmation = "Please confirm your new password.";
    if (confirm_password && new_password !== confirm_password)
      client_errors.password_confirmation = "Passwords do not match.";
    if (current_password && new_password && current_password === new_password)
      client_errors.password = "New password must be different from your current password.";

    if (Object.keys(client_errors).length > 0) {
      setFieldErrors(client_errors);
      return;
    }

    setIsSaving(true);
    try {
      const response = await profileService.changePassword({
        current_password,
        password: new_password,
        password_confirmation: confirm_password,
      });
      setSuccessMessage(response.message || "Password updated successfully.");
      resetForm();
    } catch (err: unknown) {
      const api_err = err as ApiError;
      if (api_err.errors) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(api_err.errors)) {
          mapped[key] = messages[0];
        }
        setFieldErrors(mapped);
      } else {
        setApiError(api_err.message || "Failed to update password. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const has_any_input = current_password || new_password || confirm_password;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
              <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Change Password</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose a strong password to keep your account secure.
          </p>
        </div>
      </div>

      {/* Success banner */}
      {success_message && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-3 dark:border-success-500/20 dark:bg-success-500/10">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-500 text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <p className="text-sm font-medium text-success-700 dark:text-success-400">{success_message}</p>
        </div>
      )}

      {/* API error */}
      {api_error && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 dark:border-error-500/20 dark:bg-error-500/10">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-error-100 dark:bg-error-500/20">
            <svg className="h-4 w-4 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </span>
          <p className="text-sm text-error-600 dark:text-error-400">{api_error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          {/* Current Password */}
          <div>
            <Label htmlFor="current_password">Current Password</Label>
            <div className="relative">
              <Input
                id="current_password"
                name="current_password"
                type={show_current ? "text" : "password"}
                value={current_password}
                placeholder="Enter your current password"
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (field_errors.current_password) setFieldErrors((p) => ({ ...p, current_password: "" }));
                }}
              />
              <EyeButton visible={show_current} onToggle={() => setShowCurrent((v) => !v)} />
            </div>
            {field_errors.current_password && <FieldError message={field_errors.current_password} />}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400 dark:bg-gray-900 dark:text-gray-500">
                New password
              </span>
            </div>
          </div>

          {/* New Password */}
          <div>
            <Label htmlFor="new_password">New Password</Label>
            <div className="relative">
              <Input
                id="new_password"
                name="new_password"
                type={show_new ? "text" : "password"}
                value={new_password}
                placeholder="Enter your new password"
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (field_errors.password) setFieldErrors((p) => ({ ...p, password: "" }));
                }}
              />
              <EyeButton visible={show_new} onToggle={() => setShowNew((v) => !v)} />
            </div>
            {field_errors.password && <FieldError message={field_errors.password} />}

            {/* Strength meter */}
            {new_password && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 w-10 rounded-full transition-all duration-300 ${
                          strength.score >= level
                            ? strength.bar_color
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    ))}
                  </div>
                  {strength.label && (
                    <span className={`text-xs font-medium ${strength.color}`}>
                      {strength.label}
                    </span>
                  )}
                </div>

                {/* Requirements */}
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {requirements.map((req) => (
                    <div key={req.label} className="flex items-center gap-1.5">
                      {req.met ? (
                        <svg className="h-3.5 w-3.5 shrink-0 text-success-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      )}
                      <span className={`text-xs ${req.met ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                name="confirm_password"
                type={show_confirm ? "text" : "password"}
                value={confirm_password}
                placeholder="Re-enter your new password"
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (field_errors.password_confirmation)
                    setFieldErrors((p) => ({ ...p, password_confirmation: "" }));
                }}
              />
              <EyeButton visible={show_confirm} onToggle={() => setShowConfirm((v) => !v)} />
            </div>

            {/* Match indicator */}
            {passwords_match && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-success-600 dark:text-success-400">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Passwords match
              </p>
            )}
            {passwords_mismatch && !field_errors.password_confirmation && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-error-600 dark:text-error-400">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Passwords do not match
              </p>
            )}
            {field_errors.password_confirmation && (
              <FieldError message={field_errors.password_confirmation} />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-gray-100 pt-5 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            You will remain signed in after changing your password.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {has_any_input && !is_saving && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/5"
              >
                Clear
              </button>
            )}
            <Button size="sm" variant="primary" disabled={is_saving}>
              {is_saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Updating…
                </span>
              ) : (
                "Update Password"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
