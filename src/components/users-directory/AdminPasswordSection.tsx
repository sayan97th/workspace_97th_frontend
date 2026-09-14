"use client";
import React, { useCallback, useState } from "react";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileSectionHeader from "@/components/profile/ProfileSectionHeader";
import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileFieldError from "@/components/profile/ProfileFieldError";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { inputClass, labelClass, primaryButtonClass, outlineButtonClass } from "@/components/profile/profileStyles";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { adminUsersService } from "@/services/administration/admin-users.service";
import { CheckIcon, EyeIcon, EyeOffIcon, KeyIcon, MailIcon, PlusIcon } from "@/icons/workspace-icons";
import type { AdminUserDto } from "@/types/administration/admin-users";
import type { ApiError } from "@/types/auth";

// ── Password strength (mirrors ChangePasswordSection's own account password form) ─────────

type PasswordStrength = { score: number; label: string; color: string; bar_color: string };

function evaluateStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "", color: "", bar_color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
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

type Requirement = { label: string; met: boolean };

function getRequirements(password: string): Requirement[] {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Uppercase & lowercase letters", met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "At least one number", met: /[0-9]/.test(password) },
    { label: "At least one special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

const EyeButton: React.FC<{ visible: boolean; onToggle: () => void }> = ({ visible, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-shell-text-faint transition-colors hover:text-shell-text-secondary"
    tabIndex={-1}
  >
    {visible ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
  </button>
);

export type AdminPasswordSectionProps = {
  user: AdminUserDto;
};

/**
 * "Account security" card for {@link EditUserView}: lets an administrator either set a
 * new password for the account directly, or email the account a reset link so the person
 * picks their own, mirroring the two flows `UserController::setPassword()` and
 * `UserController::sendPasswordResetLink()` expose. Reachable only for other accounts, not
 * the signed-in admin's own, since the "Edit" link that opens this page never appears on the
 * admin's own row (see `UsersDirectoryTable`) — the backend enforces the same restriction.
 */
const AdminPasswordSection: React.FC<AdminPasswordSectionProps> = ({ user }) => {
  const [new_password, setNewPassword] = useState("");
  const [confirm_password, setConfirmPassword] = useState("");
  const [show_new, setShowNew] = useState(false);
  const [show_confirm, setShowConfirm] = useState(false);
  const [field_errors, setFieldErrors] = useState<Record<string, string>>({});
  const [is_saving, setIsSaving] = useState(false);
  const [save_error, setSaveError] = useState<string | null>(null);
  const [save_success, setSaveSuccess] = useState<string | null>(null);

  const [is_reset_link_modal_open, setIsResetLinkModalOpen] = useState(false);
  const [reset_link_success, setResetLinkSuccess] = useState<string | null>(null);
  const [reset_link_error, setResetLinkError] = useState<string | null>(null);

  const strength = evaluateStrength(new_password);
  const requirements = getRequirements(new_password);
  const passwords_match = confirm_password.length > 0 && new_password === confirm_password;
  const passwords_mismatch = confirm_password.length > 0 && new_password !== confirm_password;
  const has_any_input = new_password || confirm_password;

  const resetForm = useCallback(() => {
    setNewPassword("");
    setConfirmPassword("");
    setFieldErrors({});
    setSaveError(null);
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);
    setFieldErrors({});

    const client_errors: Record<string, string> = {};
    if (!new_password) client_errors.password = "A new password is required.";
    else if (strength.score < 2) client_errors.password = "This password is too weak. Make it stronger.";
    if (!confirm_password) client_errors.password_confirmation = "Please confirm the new password.";
    else if (confirm_password !== new_password) client_errors.password_confirmation = "Passwords do not match.";

    if (Object.keys(client_errors).length > 0) {
      setFieldErrors(client_errors);
      return;
    }

    setIsSaving(true);
    try {
      const response = await adminUsersService.setPassword(user.id, {
        password: new_password,
        password_confirmation: confirm_password,
      });
      setSaveSuccess(response.message || "Password updated successfully.");
      resetForm();
    } catch (err: unknown) {
      const api_error = err as ApiError;
      if (api_error.errors) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(api_error.errors)) {
          mapped[key] = messages[0];
        }
        setFieldErrors(mapped);
      } else {
        setSaveError(apiErrorMessage(err, "We couldn't update this account's password."));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const confirmSendResetLink = useCallback(async () => {
    setResetLinkError(null);
    const response = await adminUsersService.sendPasswordResetLink(user.id);
    setResetLinkSuccess(response.message || `A password reset email has been sent to ${user.email}.`);
  }, [user.id, user.email]);

  return (
    <>
      <ProfileCard>
        <ProfileSectionHeader
          icon={<KeyIcon size={16} />}
          title="Account security"
          description="Set a new password for this account directly, or send the person a link so they can choose their own."
        />

        {save_success ? (
          <ProfileBanner tone="success" className="mb-5">
            {save_success}
          </ProfileBanner>
        ) : null}
        {save_error ? (
          <ProfileBanner tone="error" className="mb-5">
            {save_error}
          </ProfileBanner>
        ) : null}

        <form onSubmit={handleSetPassword} noValidate>
          <div className="space-y-5">
            <div>
              <label className={labelClass} htmlFor="admin_new_password">
                New password
              </label>
              <div className="relative">
                <input
                  id="admin_new_password"
                  name="admin_new_password"
                  type={show_new ? "text" : "password"}
                  value={new_password}
                  autoComplete="new-password"
                  placeholder="Enter a new password for this account"
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (field_errors.password) setFieldErrors((p) => ({ ...p, password: "" }));
                  }}
                  className={`${inputClass(!!field_errors.password)} pr-11`}
                />
                <EyeButton visible={show_new} onToggle={() => setShowNew((v) => !v)} />
              </div>
              {field_errors.password ? <ProfileFieldError message={field_errors.password} /> : null}

              {new_password ? (
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
                    {strength.label ? (
                      <span className={`text-xs font-medium ${strength.color}`}>{strength.label}</span>
                    ) : null}
                  </div>

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
              ) : null}
            </div>

            <div>
              <label className={labelClass} htmlFor="admin_confirm_password">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  id="admin_confirm_password"
                  name="admin_confirm_password"
                  type={show_confirm ? "text" : "password"}
                  value={confirm_password}
                  autoComplete="new-password"
                  placeholder="Re-enter the new password"
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (field_errors.password_confirmation) setFieldErrors((p) => ({ ...p, password_confirmation: "" }));
                  }}
                  className={`${inputClass(!!field_errors.password_confirmation)} pr-11`}
                />
                <EyeButton visible={show_confirm} onToggle={() => setShowConfirm((v) => !v)} />
              </div>

              {passwords_match ? (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-success-600">
                  <CheckIcon size={13} className="flex-none" />
                  Passwords match
                </p>
              ) : null}
              {passwords_mismatch && !field_errors.password_confirmation ? (
                <p className="mt-1.5 text-xs text-[#ff8a94]">Passwords do not match</p>
              ) : null}
              {field_errors.password_confirmation ? (
                <ProfileFieldError message={field_errors.password_confirmation} />
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-shell-border pt-5">
            <p className="text-xs text-shell-text-faint">
              The account will need to sign in again with this password next time.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {has_any_input && !is_saving ? (
                <button type="button" onClick={resetForm} className={outlineButtonClass}>
                  Clear
                </button>
              ) : null}
              <button type="submit" disabled={is_saving} className={primaryButtonClass}>
                {is_saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Updating…
                  </span>
                ) : (
                  "Set password"
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-6 border-t border-shell-border pt-5">
          {reset_link_success ? (
            <ProfileBanner tone="success" className="mb-4">
              {reset_link_success}
            </ProfileBanner>
          ) : null}
          {reset_link_error ? (
            <ProfileBanner tone="error" className="mb-4">
              {reset_link_error}
            </ProfileBanner>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                <MailIcon size={14} />
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-shell-text">Send a password reset link instead</p>
                <p className="mt-0.5 text-xs text-shell-text-muted">
                  Emails {user.email} a link to choose their own password. The link expires after a short time.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setResetLinkError(null);
                setIsResetLinkModalOpen(true);
              }}
              className={outlineButtonClass}
            >
              Send reset link
            </button>
          </div>
        </div>
      </ProfileCard>

      <ConfirmActionModal
        is_open={is_reset_link_modal_open}
        title="Send password reset link"
        description={
          <>
            This will email &quot;<strong>{user.full_name}</strong>&quot; at <strong>{user.email}</strong> a link to
            reset their password. They will be told a password reset was requested for their account.
          </>
        }
        confirm_label="Send email"
        variant="neutral"
        onConfirm={confirmSendResetLink}
        onClose={() => setIsResetLinkModalOpen(false)}
      />
    </>
  );
};

export default AdminPasswordSection;
