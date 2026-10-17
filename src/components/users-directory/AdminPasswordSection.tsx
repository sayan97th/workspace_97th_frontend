"use client";
import React, { useCallback, useState } from "react";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { InvitationIconButton, type InvitationTone } from "@/components/invitations";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { adminUsersService } from "@/services/administration/admin-users.service";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  MailIcon,
  MinusIcon,
} from "@/icons/workspace-icons";
import EditUserSection, { EditUserFieldError } from "./EditUserSection";
import type { AdminUserDto } from "@/types/administration/admin-users";
import type { ApiError } from "@/types/auth";

// ── Password strength (mirrors ChangePasswordSection's own account password form) ─────────

type PasswordStrength = { score: number; label: string; tone: InvitationTone };

function evaluateStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "", tone: "neutral" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  score = Math.min(score, 4);

  const levels: PasswordStrength[] = [
    { score: 0, label: "", tone: "neutral" },
    { score: 1, label: "Weak", tone: "danger" },
    { score: 2, label: "Fair", tone: "warning" },
    { score: 3, label: "Good", tone: "info" },
    { score: 4, label: "Strong", tone: "success" },
  ];

  return levels[score];
}

type Requirement = { label: string; met: boolean };

function getRequirements(password: string): Requirement[] {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Uppercase and lowercase letters", met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "At least one number", met: /[0-9]/.test(password) },
    { label: "At least one special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

/** Show or hide toggle inside a password input, its label doubles as the tooltip. */
const EyeButton: React.FC<{ visible: boolean; onToggle: () => void }> = ({ visible, onToggle }) => (
  <span className="ud-input-trailing">
    <InvitationIconButton label={visible ? "Hide password" : "Show password"} onClick={onToggle}>
      {visible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
    </InvitationIconButton>
  </span>
);

export type AdminPasswordSectionProps = {
  user: AdminUserDto;
};

/**
 * Password tab of {@link EditUserView}: lets an administrator either set a new password for
 * the account directly, or email the account a reset link so the person picks their own, mirroring the two flows `UserController::setPassword()` and
 * `UserController::sendPasswordResetLink()` expose. Reachable only for other accounts, not
 * the signed-in admin's own, since the "Edit" link that opens this page never appears on the
 * admin's own row (see `UsersDirectoryTable`), the backend enforces the same restriction.
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
      <div className="ud-stack">
        <form onSubmit={handleSetPassword} noValidate>
          <EditUserSection
            icon={<KeyIcon size={17} />}
            title="Set a new password"
            description="Choose the password for this account yourself, for when the person needs working credentials right away."
            footer={
              <>
                <p className="ud-footer-hint">They will sign in with this password from now on.</p>
                <div className="ud-footer-actions">
                  {has_any_input && !is_saving ? (
                    <button type="button" onClick={resetForm} className="inv-button inv-button-ghost">
                      Clear
                    </button>
                  ) : null}
                  <button type="submit" disabled={is_saving || !has_any_input} className="inv-button inv-button-primary">
                    {is_saving ? <span className="ud-button-spinner" aria-hidden /> : null}
                    {is_saving ? "Updating" : "Set password"}
                  </button>
                </div>
              </>
            }
          >
            {save_success ? (
              <div role="status" className="inv-notice" data-tone="success">
                <CheckCircleIcon size={16} />
                <span>{save_success}</span>
              </div>
            ) : null}
            {save_error ? (
              <div role="alert" className="inv-notice" data-tone="danger">
                <AlertCircleIcon size={16} />
                <span>{save_error}</span>
              </div>
            ) : null}

            <div className="ud-form-grid">
              <div className="ud-field-full">
                <label className="ud-label" htmlFor="admin_new_password">
                  New password
                </label>
                <div className="ud-input-wrap">
                  <input
                    id="admin_new_password"
                    name="admin_new_password"
                    type={show_new ? "text" : "password"}
                    value={new_password}
                    autoComplete="new-password"
                    placeholder="Enter a new password for this account"
                    aria-invalid={field_errors.password ? true : undefined}
                    aria-describedby={field_errors.password ? "admin_new_password_error" : undefined}
                    data-has-trailing="true"
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setSaveSuccess(null);
                      if (field_errors.password) setFieldErrors((p) => ({ ...p, password: "" }));
                    }}
                    className="ud-input"
                  />
                  <EyeButton visible={show_new} onToggle={() => setShowNew((v) => !v)} />
                </div>
                <EditUserFieldError id="admin_new_password_error" message={field_errors.password} />

                {new_password ? (
                  <>
                    <div className="ud-strength" data-tone={strength.tone}>
                      <span className="ud-strength-bars" aria-hidden>
                        {[1, 2, 3, 4].map((level) => (
                          <span key={level} data-on={strength.score >= level ? "true" : "false"} />
                        ))}
                      </span>
                      {strength.label ? <span className="ud-strength-label">{strength.label}</span> : null}
                    </div>

                    <ul className="ud-requirements">
                      {requirements.map((req) => (
                        <li key={req.label} className="ud-requirement" data-met={req.met ? "true" : "false"}>
                          {req.met ? <CheckIcon size={13} /> : <MinusIcon size={13} />}
                          {req.label}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="ud-field-hint">Use at least 8 characters with letters, numbers and a symbol.</p>
                )}
              </div>

              <div className="ud-field-full">
                <label className="ud-label" htmlFor="admin_confirm_password">
                  Confirm new password
                </label>
                <div className="ud-input-wrap">
                  <input
                    id="admin_confirm_password"
                    name="admin_confirm_password"
                    type={show_confirm ? "text" : "password"}
                    value={confirm_password}
                    autoComplete="new-password"
                    placeholder="Enter the new password again"
                    aria-invalid={field_errors.password_confirmation || passwords_mismatch ? true : undefined}
                    data-has-trailing="true"
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (field_errors.password_confirmation) setFieldErrors((p) => ({ ...p, password_confirmation: "" }));
                    }}
                    className="ud-input"
                  />
                  <EyeButton visible={show_confirm} onToggle={() => setShowConfirm((v) => !v)} />
                </div>

                {passwords_match ? (
                  <p className="ud-field-success">
                    <CheckIcon size={13} />
                    Passwords match
                  </p>
                ) : null}
                {field_errors.password_confirmation ? (
                  <EditUserFieldError message={field_errors.password_confirmation} />
                ) : passwords_mismatch ? (
                  <EditUserFieldError message="Passwords do not match" />
                ) : null}
              </div>
            </div>
          </EditUserSection>
        </form>

        <EditUserSection
          icon={<MailIcon size={17} />}
          title="Send a password reset link"
          description="Let the person choose their own password. The link expires after a short time."
          tone="info"
          is_flush
        >
          {reset_link_success || reset_link_error ? (
            <div className="px-6">
              <div
                role={reset_link_error ? "alert" : "status"}
                className="inv-notice"
                data-tone={reset_link_error ? "danger" : "success"}
              >
                {reset_link_error ? <AlertCircleIcon size={16} /> : <CheckCircleIcon size={16} />}
                <span>{reset_link_error ?? reset_link_success}</span>
              </div>
            </div>
          ) : null}
          <div className="ud-action-list">
            <div className="ud-action-row">
              <div className="ud-action-text">
                <p className="ud-action-title">Email {user.email}</p>
                <p className="ud-action-description">
                  They get the same link as &quot;Forgot password&quot; on the sign in page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetLinkError(null);
                  setIsResetLinkModalOpen(true);
                }}
                className="inv-button inv-button-secondary"
              >
                <MailIcon size={15} />
                Send reset link
              </button>
            </div>
          </div>
        </EditUserSection>
      </div>

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
