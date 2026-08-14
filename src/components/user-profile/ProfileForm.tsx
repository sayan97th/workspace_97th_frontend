"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { SettingsDropdown } from "@/components/administration";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileSectionHeader from "@/components/profile/ProfileSectionHeader";
import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileFieldError from "@/components/profile/ProfileFieldError";
import { inputClass, labelClass, primaryButtonClass } from "@/components/profile/profileStyles";
import {
  PersonIcon,
  MailIcon,
  PhoneIcon,
  ClockIcon,
  CameraIcon,
  UploadIcon,
  DeleteIcon,
} from "@/icons/workspace-icons";
import { useAuth } from "@/context/AuthContext";
import { profileService } from "@/services/profile.service";
import { timezone_options } from "@/data/timezone-options";
import type { ProfileData, ApiError } from "@/types/auth";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const default_form_data: ProfileData = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  timezone: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== "string" || url.trim() === "") return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ── Avatar Upload ─────────────────────────────────────────────────────────────

interface AvatarUploadProps {
  first_name: string;
  last_name: string;
  profile_photo_url: string | null;
  onPhotoUpload: (file: File) => Promise<void>;
  onPhotoDelete: () => Promise<void>;
}

const AvatarUpload = ({
  first_name,
  last_name,
  profile_photo_url,
  onPhotoUpload,
  onPhotoDelete,
}: AvatarUploadProps) => {
  const [avatar_preview, setAvatarPreview] = useState<string | null>(null);
  const [is_uploading, setIsUploading] = useState(false);
  const [is_deleting, setIsDeleting] = useState(false);
  const [upload_error, setUploadError] = useState<string | null>(null);
  const [has_image_error, setHasImageError] = useState(false);
  const file_input_ref = useRef<HTMLInputElement>(null);

  const full_name = `${first_name} ${last_name}`.trim();
  const initials =
    full_name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const validated_url = isValidUrl(profile_photo_url) ? profile_photo_url : null;
  const displayed_photo = avatar_preview || (has_image_error ? null : validated_url);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) return "Invalid file type. Use PNG, JPG, GIF, or WebP.";
    if (file.size > MAX_FILE_SIZE) return "File exceeds 2 MB. Please choose a smaller image.";
    return null;
  };

  const handleFileSelect = async (file: File) => {
    const err = validateFile(file);
    if (err) { setUploadError(err); return; }
    setUploadError(null);
    setHasImageError(false);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setIsUploading(true);
    try {
      await onPhotoUpload(file);
    } catch {
      setUploadError("Failed to upload photo. Please try again.");
      setAvatarPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    setUploadError(null);
    setIsDeleting(true);
    try {
      await onPhotoDelete();
      setAvatarPreview(null);
      if (file_input_ref.current) file_input_ref.current.value = "";
    } catch {
      setUploadError("Failed to remove photo. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <input
        ref={file_input_ref}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
        className="hidden"
        id="profile_avatar_upload"
        disabled={is_uploading}
      />

      {upload_error && (
        <ProfileBanner tone="error" className="mb-3">
          {upload_error}
        </ProfileBanner>
      )}

      <div className="flex items-center gap-5">
        {/* Avatar */}
        <div className="group relative shrink-0">
          <div className="h-20 w-20 overflow-hidden rounded-2xl ring-4 ring-shell-panel">
            {is_uploading ? (
              <div className="flex h-full w-full items-center justify-center bg-shell-hover">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-shell-border-strong border-t-brand-500" />
              </div>
            ) : displayed_photo ? (
              <Image
                src={displayed_photo}
                alt="Profile photo"
                width={80}
                height={80}
                unoptimized
                className="h-full w-full object-cover"
                onError={() => setHasImageError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-xl font-bold text-white">
                {initials}
              </div>
            )}
          </div>
          {!is_uploading && (
            <button
              type="button"
              onClick={() => file_input_ref.current?.click()}
              className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <CameraIcon size={20} className="text-white" />
            </button>
          )}
        </div>

        {/* Upload controls */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-shell-text">
            {is_uploading ? "Uploading…" : full_name || "Your Profile"}
          </p>
          <p className="mt-0.5 text-xs text-shell-text-muted">
            PNG, JPG, GIF or WebP · max 2 MB
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => file_input_ref.current?.click()}
              disabled={is_uploading || is_deleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-shell-border-strong bg-shell-panel-alt px-3 py-1.5 text-xs font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UploadIcon size={13} />
              Upload
            </button>
            {displayed_photo && (
              <button
                type="button"
                onClick={handleDeletePhoto}
                disabled={is_uploading || is_deleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2445c]/30 bg-shell-panel-alt px-3 py-1.5 text-xs font-medium text-[#ff8a94] transition-colors hover:bg-[#e2445c]/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {is_deleting ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#e2445c]/30 border-t-[#e2445c]" />
                ) : (
                  <DeleteIcon size={13} />
                )}
                {is_deleting ? "Removing…" : "Remove"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProfileForm() {
  const { user, refreshUser } = useAuth();
  const [form_data, setFormData] = useState<ProfileData>(default_form_data);
  const [profile_photo_url, setProfilePhotoUrl] = useState<string | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [success_message, setSuccessMessage] = useState<string | null>(null);
  const [field_errors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await profileService.fetchUserProfile();
        const sanitized_data: ProfileData = { ...default_form_data };
        for (const key of Object.keys(default_form_data) as Array<keyof ProfileData>) {
          if (data[key] !== null && data[key] !== undefined) {
            (sanitized_data as unknown as Record<string, unknown>)[key] = data[key];
          }
        }
        setFormData(sanitized_data);
        setProfilePhotoUrl(data.profile_photo_url ?? null);
      } catch {
        setErrorMessage("Failed to load profile data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleFieldChange = (field: keyof ProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field_errors[field]) setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handlePhotoUpload = async (file: File) => {
    const response = await profileService.uploadProfilePhoto(file);
    setProfilePhotoUrl(response.profile_photo_url);
    await refreshUser();
  };

  const handlePhotoDelete = async () => {
    const response = await profileService.deleteProfilePhoto();
    setProfilePhotoUrl(response.profile_photo_url);
    await refreshUser();
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});
    try {
      await profileService.updateUserProfile(form_data);
      await refreshUser();
      setSuccessMessage("Profile updated successfully.");
    } catch (err: unknown) {
      const api_err = err as ApiError;
      if (api_err.errors) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(api_err.errors)) {
          mapped[key] = messages[0];
        }
        setFieldErrors(mapped);
        setErrorMessage("Please fix the highlighted fields and try again.");
      } else {
        setErrorMessage(api_err.message || "Failed to save profile. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const member_since = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  if (is_loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-shell-border-strong border-t-brand-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Alerts */}
      {error_message && (
        <ProfileBanner tone="error" className="mb-6">
          {error_message}
        </ProfileBanner>
      )}
      {success_message && (
        <ProfileBanner tone="success" className="mb-6">
          {success_message}
        </ProfileBanner>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ── Left: Identity Card ──────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="overflow-hidden rounded-2xl border border-shell-border bg-shell-panel-alt">
              {/* Cover gradient */}
              <div className="h-20 bg-gradient-to-r from-brand-500 to-brand-700" />

              {/* Avatar + info */}
              <div className="px-5 pb-5">
                <div className="-mt-10 mb-4">
                  <div className="inline-block rounded-2xl ring-4 ring-shell-panel-alt">
                    <div className="h-[72px] w-[72px] overflow-hidden rounded-2xl">
                      {isValidUrl(profile_photo_url) ? (
                        <Image
                          src={profile_photo_url}
                          alt="Profile"
                          width={72}
                          height={72}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-xl font-bold text-white">
                          {(form_data.first_name[0] ?? "") + (form_data.last_name[0] ?? "") || "U"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-shell-text">
                  {form_data.first_name || form_data.last_name
                    ? `${form_data.first_name} ${form_data.last_name}`.trim()
                    : user?.email ?? "User"}
                </h3>
                <p className="mt-0.5 text-sm text-shell-text-muted">
                  {form_data.email || user?.email}
                </p>

                {form_data.phone && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-shell-text-muted">
                    <PhoneIcon size={13} className="flex-none" />
                    {form_data.phone}
                  </div>
                )}

                {form_data.timezone && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-shell-text-muted">
                    <ClockIcon size={13} className="flex-none" />
                    {form_data.timezone}
                  </div>
                )}
              </div>

              {member_since && (
                <div className="border-t border-shell-border px-5 py-3">
                  <p className="text-xs text-shell-text-muted">
                    Member since{" "}
                    <span className="font-medium text-shell-text-secondary">
                      {member_since}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Edit Sections ─────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Personal Information */}
          <ProfileCard>
            <ProfileSectionHeader
              icon={<PersonIcon size={16} />}
              title="Personal Information"
              description="Update your name and profile photo."
            />

            <div className="mb-6">
              <label className={labelClass}>Profile Photo</label>
              <AvatarUpload
                first_name={form_data.first_name}
                last_name={form_data.last_name}
                profile_photo_url={profile_photo_url}
                onPhotoUpload={handlePhotoUpload}
                onPhotoDelete={handlePhotoDelete}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="first_name">First Name</label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  defaultValue={form_data.first_name}
                  placeholder="First name"
                  onChange={(e) => handleFieldChange("first_name", e.target.value)}
                  className={inputClass(!!field_errors.first_name)}
                />
                {field_errors.first_name && <ProfileFieldError message={field_errors.first_name} />}
              </div>
              <div>
                <label className={labelClass} htmlFor="last_name">Last Name</label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  defaultValue={form_data.last_name}
                  placeholder="Last name"
                  onChange={(e) => handleFieldChange("last_name", e.target.value)}
                  className={inputClass(!!field_errors.last_name)}
                />
                {field_errors.last_name && <ProfileFieldError message={field_errors.last_name} />}
              </div>
            </div>
          </ProfileCard>

          {/* Contact & Preferences */}
          <ProfileCard>
            <ProfileSectionHeader
              icon={<MailIcon size={16} />}
              title="Contact Details"
              description="Your email, phone number, and timezone."
            />

            <div className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="email">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={form_data.email}
                  placeholder="you@example.com"
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  className={inputClass(!!field_errors.email)}
                />
                {field_errors.email && <ProfileFieldError message={field_errors.email} />}
              </div>

              <div>
                <label className={labelClass} htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  defaultValue={form_data.phone ?? ""}
                  placeholder="+1 (555) 000-0000"
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                  className={inputClass(!!field_errors.phone)}
                />
                {field_errors.phone && <ProfileFieldError message={field_errors.phone} />}
              </div>

              <div>
                <label className={labelClass}>Timezone</label>
                <SettingsDropdown
                  value={form_data.timezone || null}
                  options={timezone_options.map((option) => ({ id: option.value, label: option.label }))}
                  onChange={(id) => handleFieldChange("timezone", id)}
                  placeholder="Select your timezone"
                  className="w-full"
                />
                {field_errors.timezone && <ProfileFieldError message={field_errors.timezone} />}
              </div>
            </div>
          </ProfileCard>

          {/* Save profile button */}
          <div className="flex items-center justify-end gap-3">
            <p className="text-xs text-shell-text-faint">
              Changes will be applied immediately.
            </p>
            <button type="button" disabled={is_saving} onClick={handleSubmit} className={primaryButtonClass}>
              {is_saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving…
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
