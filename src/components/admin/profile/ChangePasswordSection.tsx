"use client";

import React, { useState, useCallback } from "react";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileSectionHeader from "@/components/profile/ProfileSectionHeader";
import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileFieldError from "@/components/profile/ProfileFieldError";
import { inputClass, labelClass, primaryButtonClass, outlineButtonClass } from "@/components/profile/profileStyles";
import { PermissionsIcon, EyeIcon, EyeOffIcon, CheckIcon, PlusIcon } from "@/icons/workspace-icons";
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
    { score: 1, label: "Weak", color: "text-error-600", bar_color: "bg-error-500" },
    { score: 2, label: "Fair", color: "text-warning-600", bar_color: "bg-warning-500" },
    { score: 3, label: "Good", color: "text-blue-600", bar_color: "bg-blue-500" },
    { score: 4, label: "Strong", color: "text-success-600", bar_color: "bg-success-500" },
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
    className="absolute right-3 top-1/2 -translate-y-1/2 text-shell-text-faint transition-colors hover:text-shell-text-secondary"
    tabIndex={-1}
  >
    {visible ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
  </button>
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
    <ProfileCard>
      <ProfileSectionHeader
        icon={<PermissionsIcon size={16} />}
        title="Change Password"
        description="Choose a strong password to keep your account secure."
      />

      {success_message && (
        <ProfileBanner tone="success" className="mb-5">
          {success_message}
        </ProfileBanner>
      )}

      {api_error && (
        <ProfileBanner tone="error" className="mb-5">
          {api_error}
        </ProfileBanner>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          {/* Current Password */}
          <div>
            <label className={labelClass} htmlFor="current_password">Current Password</label>
            <div className="relative">
              <input
                id="current_password"
                name="current_password"
                type={show_current ? "text" : "password"}
                value={current_password}
                placeholder="Enter your current password"
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (field_errors.current_password) setFieldErrors((p) => ({ ...p, current_password: "" }));
                }}
                className={`${inputClass(!!field_errors.current_password)} pr-11`}
              />
              <EyeButton visible={show_current} onToggle={() => setShowCurrent((v) => !v)} />
            </div>
            {field_errors.current_password && <ProfileFieldError message={field_errors.current_password} />}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-shell-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-shell-panel-alt px-3 text-xs text-shell-text-faint">
                New password
              </span>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className={labelClass} htmlFor="new_password">New Password</label>
            <div className="relative">
              <input
                id="new_password"
                name="new_password"
                type={show_new ? "text" : "password"}
                value={new_password}
                placeholder="Enter your new password"
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (field_errors.password) setFieldErrors((p) => ({ ...p, password: "" }));
                }}
                className={`${inputClass(!!field_errors.password)} pr-11`}
              />
              <EyeButton visible={show_new} onToggle={() => setShowNew((v) => !v)} />
            </div>
            {field_errors.password && <ProfileFieldError message={field_errors.password} />}

            {/* Strength meter */}
            {new_password && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 w-10 rounded-full transition-all duration-300 ${
                          strength.score >= level ? strength.bar_color : "bg-shell-hover-strong"
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
                        <CheckIcon size={13} className="flex-none text-success-500" />
                      ) : (
                        <PlusIcon size={13} className="flex-none text-shell-text-faint" />
                      )}
                      <span className={`text-xs ${req.met ? "text-shell-text-secondary" : "text-shell-text-muted"}`}>
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
            <label className={labelClass} htmlFor="confirm_password">Confirm New Password</label>
            <div className="relative">
              <input
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
                className={`${inputClass(!!field_errors.password_confirmation)} pr-11`}
              />
              <EyeButton visible={show_confirm} onToggle={() => setShowConfirm((v) => !v)} />
            </div>

            {/* Match indicator */}
            {passwords_match && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-success-600">
                <CheckIcon size={13} className="flex-none" />
                Passwords match
              </p>
            )}
            {passwords_mismatch && !field_errors.password_confirmation && (
              <p className="mt-1.5 text-xs text-[#ff8a94]">Passwords do not match</p>
            )}
            {field_errors.password_confirmation && (
              <ProfileFieldError message={field_errors.password_confirmation} />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-shell-border pt-5">
          <p className="text-xs text-shell-text-faint">
            You will remain signed in after changing your password.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {has_any_input && !is_saving && (
              <button type="button" onClick={resetForm} className={outlineButtonClass}>
                Clear
              </button>
            )}
            <button type="submit" disabled={is_saving} className={primaryButtonClass}>
              {is_saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Updating…
                </span>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </div>
      </form>
    </ProfileCard>
  );
}
