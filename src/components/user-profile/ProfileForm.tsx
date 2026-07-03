"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { profileService } from "@/services/profile.service";
import type { ProfileData, ApiError } from "@/types/auth";
import ChangePasswordSection from "@/components/admin/profile/ChangePasswordSection";
import TwoFactorSection from "./TwoFactorSection";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const timezone_options = [
  { value: "America/New_York", label: "America/New York (UTC-05:00)" },
  { value: "America/Chicago", label: "America/Chicago (UTC-06:00)" },
  { value: "America/Denver", label: "America/Denver (UTC-07:00)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (UTC-08:00)" },
  { value: "America/Anchorage", label: "America/Anchorage (UTC-09:00)" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (UTC-10:00)" },
  { value: "America/Toronto", label: "America/Toronto (UTC-05:00)" },
  { value: "America/Vancouver", label: "America/Vancouver (UTC-08:00)" },
  { value: "America/Sao_Paulo", label: "America/Sao Paulo (UTC-03:00)" },
  { value: "America/Argentina/Buenos_Aires", label: "America/Buenos Aires (UTC-03:00)" },
  { value: "America/Mexico_City", label: "America/Mexico City (UTC-06:00)" },
  { value: "America/Bogota", label: "America/Bogota (UTC-05:00)" },
  { value: "America/Lima", label: "America/Lima (UTC-05:00)" },
  { value: "America/Santiago", label: "America/Santiago (UTC-04:00)" },
  { value: "Atlantic/Azores", label: "Atlantic/Azores (UTC-01:00)" },
  { value: "Europe/London", label: "Europe/London (UTC+00:00)" },
  { value: "Europe/Lisbon", label: "Europe/Lisbon (UTC+00:00)" },
  { value: "Europe/Paris", label: "Europe/Paris (UTC+01:00)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (UTC+01:00)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (UTC+01:00)" },
  { value: "Europe/Rome", label: "Europe/Rome (UTC+01:00)" },
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam (UTC+01:00)" },
  { value: "Europe/Athens", label: "Europe/Athens (UTC+02:00)" },
  { value: "Europe/Helsinki", label: "Europe/Helsinki (UTC+02:00)" },
  { value: "Europe/Istanbul", label: "Europe/Istanbul (UTC+03:00)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (UTC+03:00)" },
  { value: "Africa/Casablanca", label: "Africa/Casablanca (UTC+00:00)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (UTC+01:00)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (UTC+03:00)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (UTC+04:00)" },
  { value: "Asia/Karachi", label: "Asia/Karachi (UTC+05:00)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (UTC+05:30)" },
  { value: "Asia/Dhaka", label: "Asia/Dhaka (UTC+06:00)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (UTC+07:00)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (UTC+08:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (UTC+08:00)" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong Kong (UTC+08:00)" },
  { value: "Asia/Seoul", label: "Asia/Seoul (UTC+09:00)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+09:00)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (UTC+10:00)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (UTC+12:00)" },
];

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

// ── Sub-components ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

const SectionHeader = ({ icon, title, description }: SectionHeaderProps) => (
  <div className="mb-5">
    <div className="flex items-center gap-2.5">
      {icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
          {icon}
        </div>
      )}
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
    </div>
    {description && (
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
    )}
  </div>
);

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
        <div className="mb-3 rounded-lg border border-error-300 bg-error-50 px-4 py-2 text-xs text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400">
          {upload_error}
        </div>
      )}

      <div className="flex items-center gap-5">
        {/* Avatar */}
        <div className="relative shrink-0 group">
          <div className="h-20 w-20 overflow-hidden rounded-2xl ring-4 ring-white shadow-md dark:ring-gray-800">
            {is_uploading ? (
              <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
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
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </button>
          )}
        </div>

        {/* Upload controls */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {is_uploading ? "Uploading…" : full_name || "Your Profile"}
          </p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            PNG, JPG, GIF or WebP · max 2 MB
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => file_input_ref.current?.click()}
              disabled={is_uploading || is_deleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload
            </button>
            {displayed_photo && (
              <button
                type="button"
                onClick={handleDeletePhoto}
                disabled={is_uploading || is_deleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-error-200 bg-white px-3 py-1.5 text-xs font-medium text-error-600 shadow-sm transition-colors hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-error-500/30 dark:bg-gray-800 dark:text-error-400 dark:hover:bg-error-500/10"
              >
                {is_deleting ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-error-200 border-t-error-500" />
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Alerts */}
      {error_message && (
        <div className="mb-6 rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400">
          {error_message}
        </div>
      )}
      {success_message && (
        <div className="mb-6 rounded-lg border border-success-300 bg-success-50 px-4 py-3 text-sm text-success-600 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-400">
          {success_message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ── Left: Identity Card ──────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              {/* Cover gradient */}
              <div className="h-20 bg-gradient-to-r from-brand-500 to-brand-700" />

              {/* Avatar + info */}
              <div className="px-5 pb-5">
                <div className="-mt-10 mb-4">
                  <div className="inline-block rounded-2xl ring-4 ring-white shadow-md dark:ring-gray-900">
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

                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {form_data.first_name || form_data.last_name
                    ? `${form_data.first_name} ${form_data.last_name}`.trim()
                    : user?.email ?? "User"}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {form_data.email || user?.email}
                </p>

                {form_data.phone && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    {form_data.phone}
                  </div>
                )}

                {form_data.timezone && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {form_data.timezone}
                  </div>
                )}
              </div>

              {member_since && (
                <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Member since{" "}
                    <span className="font-medium text-gray-600 dark:text-gray-300">
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
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              icon={
                <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              }
              title="Personal Information"
              description="Update your name and profile photo."
            />

            <div className="mb-6">
              <Label className="mb-3">Profile Photo</Label>
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
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  defaultValue={form_data.first_name}
                  placeholder="First name"
                  error={!!field_errors.first_name}
                  hint={field_errors.first_name}
                  onChange={(e) => handleFieldChange("first_name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  defaultValue={form_data.last_name}
                  placeholder="Last name"
                  error={!!field_errors.last_name}
                  hint={field_errors.last_name}
                  onChange={(e) => handleFieldChange("last_name", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Contact & Preferences */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <SectionHeader
              icon={
                <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              }
              title="Contact Details"
              description="Your email, phone number, and timezone."
            />

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={form_data.email}
                  placeholder="you@example.com"
                  error={!!field_errors.email}
                  hint={field_errors.email}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="text"
                  defaultValue={form_data.phone ?? ""}
                  placeholder="+1 (555) 000-0000"
                  error={!!field_errors.phone}
                  hint={field_errors.phone}
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  options={timezone_options}
                  defaultValue={form_data.timezone ?? ""}
                  onChange={(value) => handleFieldChange("timezone", value)}
                  placeholder="Select your timezone"
                />
                {field_errors.timezone && (
                  <p className="mt-1.5 text-xs text-error-500">{field_errors.timezone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Save profile button */}
          <div className="flex items-center justify-end gap-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Changes will be applied immediately.
            </p>
            <Button size="md" variant="primary" disabled={is_saving} onClick={handleSubmit}>
              {is_saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving…
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>

          {/* Change Password */}
          <ChangePasswordSection />

          {/* Security */}
          <TwoFactorSection />

        </div>
      </div>
    </div>
  );
}
