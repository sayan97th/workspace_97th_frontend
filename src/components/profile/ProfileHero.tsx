"use client";
import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Building2, CalendarDays, Camera, Check, Clock, Copy, Mail, Phone, Trash2 } from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { getUserDisplayName } from "@/lib/user";
import { profileService } from "@/services/profile.service";
import type { ProfileOverview } from "@/types/auth";
import ProfileBanner from "./ProfileBanner";
import ProfileTooltip from "./ProfileTooltip";
import { AWAY_STATUS_KEYS, PROFILE_STATUS_ICONS } from "./profileStatusIcons";
import type { ProfileSectionId, ProfileStatusOption } from "./types";

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const AVATAR_SIZE = 96;
const MAX_VISIBLE_TEAMS = 4;

export type ProfileHeroProps = {
  overview: ProfileOverview | null;
  working_status: string;
  status_options: ProfileStatusOption[];
  onSelectSection: (id: ProfileSectionId) => void;
};

/** "10:42 AM" in the given IANA zone, or null when the zone is missing or unknown to the browser. */
const formatLocalTime = (timezone: string | null | undefined, time_format: "12" | "24" | undefined): string | null => {
  if (!timezone) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: time_format !== "24",
      timeZone: timezone,
    }).format(new Date());
  } catch {
    return null;
  }
};

const teamInitials = (name: string): string =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * Identity card at the top of {@link ProfileView}, monday style: a brand cover band, the avatar
 * (click to change, small button to remove), name, title, working status pill, roles, teams and
 * a row of account details (email, phone, local time, department, member since).
 */
const ProfileHero: React.FC<ProfileHeroProps> = ({ overview, working_status, status_options, onSelectSection }) => {
  const { user, refreshUser } = useAuth();
  const file_input_ref = useRef<HTMLInputElement>(null);
  const [is_uploading, setIsUploading] = useState(false);
  const [is_removing, setIsRemoving] = useState(false);
  const [photo_error, setPhotoError] = useState<string | null>(null);
  const [is_email_copied, setIsEmailCopied] = useState(false);
  const [local_time, setLocalTime] = useState<string | null>(null);

  // Local time ticks once a minute, computed after mount so server and client markup match.
  useEffect(() => {
    const updateLocalTime = () => setLocalTime(formatLocalTime(user?.timezone, user?.time_format));
    updateLocalTime();
    const interval_id = window.setInterval(updateLocalTime, 60_000);
    return () => window.clearInterval(interval_id);
  }, [user?.timezone, user?.time_format]);

  useEffect(() => {
    if (!is_email_copied) return;
    const timeout_id = window.setTimeout(() => setIsEmailCopied(false), 1600);
    return () => window.clearTimeout(timeout_id);
  }, [is_email_copied]);

  const uploadPhoto = async (file: File) => {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError("Use a PNG, JPG, GIF or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError("The image is larger than 2 MB. Please choose a smaller one.");
      return;
    }
    setPhotoError(null);
    setIsUploading(true);
    try {
      await profileService.uploadProfilePhoto(file);
      await refreshUser();
    } catch {
      setPhotoError("Could not upload your photo. Please try again.");
    } finally {
      setIsUploading(false);
      if (file_input_ref.current) file_input_ref.current.value = "";
    }
  };

  const removePhoto = async () => {
    setPhotoError(null);
    setIsRemoving(true);
    try {
      await profileService.deleteProfilePhoto();
      await refreshUser();
    } catch {
      setPhotoError("Could not remove your photo. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  const copyEmail = async () => {
    if (!user?.email) return;
    try {
      await navigator.clipboard.writeText(user.email);
      setIsEmailCopied(true);
    } catch {
      // Clipboard access can be blocked, the address stays visible to copy by hand.
    }
  };

  const role_names = (user?.roles ?? []).map((role) =>
    typeof role === "string" ? role.replace(/_/g, " ") : role.display_name || role.name.replace(/_/g, " ")
  );
  const member_since = user?.created_at ? format(new Date(user.created_at), "MMMM d, yyyy") : null;
  const status_option = status_options.find((option) => option.key === working_status) ?? status_options[0];
  const StatusIcon = PROFILE_STATUS_ICONS[status_option?.key ?? "office"] ?? Building2;
  const is_away = AWAY_STATUS_KEYS.includes(status_option?.key ?? "");
  const teams = overview?.teams ?? [];
  const is_busy = is_uploading || is_removing;

  return (
    <header className="profile-hero">
      <div className="profile-hero-cover" aria-hidden="true" />

      <div className="profile-hero-body">
        <div className="profile-hero-avatar">
          <input
            ref={file_input_ref}
            type="file"
            accept={ALLOWED_PHOTO_TYPES.join(",")}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadPhoto(file);
            }}
          />
          <ProfileTooltip content={user?.profile_photo_url ? "Change profile picture" : "Upload a profile picture"}>
            <button
              type="button"
              disabled={is_busy}
              onClick={() => file_input_ref.current?.click()}
              className="profile-hero-avatar-button"
              aria-label="Change profile picture"
            >
              <UserAvatar user={user} size={AVATAR_SIZE} font_size={34} />
              <span className="profile-hero-avatar-overlay" data-busy={is_busy}>
                {is_busy ? (
                  <span className="profile-spinner border-white/40 border-t-white" />
                ) : (
                  <>
                    <Camera size={20} strokeWidth={1.75} aria-hidden="true" />
                    Change
                  </>
                )}
              </span>
            </button>
          </ProfileTooltip>
          {user?.profile_photo_url && !is_busy ? (
            <span className="profile-hero-avatar-remove-slot">
              <ProfileTooltip content="Remove profile picture" placement="bottom">
                <button
                  type="button"
                  onClick={() => void removePhoto()}
                  className="profile-hero-avatar-remove"
                  aria-label="Remove profile picture"
                >
                  <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </ProfileTooltip>
            </span>
          ) : null}
        </div>

        <div className="profile-hero-identity">
          <div className="profile-hero-name-row">
            <h1 className="profile-hero-name">{getUserDisplayName(user)}</h1>
            {status_option ? (
              <ProfileTooltip content="Change your working status">
                <button
                  type="button"
                  onClick={() => onSelectSection("working")}
                  className="profile-pill profile-pill-button"
                >
                  <span className="profile-status-dot" data-away={is_away} aria-hidden="true" />
                  <StatusIcon size={13} strokeWidth={1.75} aria-hidden="true" />
                  {status_option.label}
                </button>
              </ProfileTooltip>
            ) : null}
          </div>

          {user?.job_title ? (
            <p className="profile-hero-title">{user.job_title}</p>
          ) : (
            <button type="button" onClick={() => onSelectSection("personal")} className="profile-hero-add-title mt-0.5">
              Add your title
            </button>
          )}

          <div className="profile-hero-meta">
            {user?.email ? (
              <span className="profile-hero-meta-item">
                <Mail size={14} strokeWidth={1.75} aria-hidden="true" />
                <span className="truncate">{user.email}</span>
                <ProfileTooltip content={is_email_copied ? "Copied" : "Copy email"}>
                  <button type="button" onClick={() => void copyEmail()} className="profile-icon-button" aria-label="Copy email">
                    {is_email_copied ? (
                      <Check size={13} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <Copy size={13} strokeWidth={1.75} aria-hidden="true" />
                    )}
                  </button>
                </ProfileTooltip>
              </span>
            ) : null}
            {user?.phone ? (
              <ProfileTooltip content="Phone">
                <span className="profile-hero-meta-item">
                  <Phone size={14} strokeWidth={1.75} aria-hidden="true" />
                  {user.phone}
                </span>
              </ProfileTooltip>
            ) : null}
            {local_time ? (
              <ProfileTooltip content={`Your time zone is ${user?.timezone}`}>
                <span className="profile-hero-meta-item">
                  <Clock size={14} strokeWidth={1.75} aria-hidden="true" />
                  {local_time} local time
                </span>
              </ProfileTooltip>
            ) : null}
            {overview?.department ? (
              <ProfileTooltip content="Department">
                <span className="profile-hero-meta-item">
                  <Building2 size={14} strokeWidth={1.75} aria-hidden="true" />
                  {overview.department.name}
                </span>
              </ProfileTooltip>
            ) : null}
            {member_since ? (
              <ProfileTooltip content="Member since">
                <span className="profile-hero-meta-item">
                  <CalendarDays size={14} strokeWidth={1.75} aria-hidden="true" />
                  Joined {member_since}
                </span>
              </ProfileTooltip>
            ) : null}
          </div>
        </div>

        <div className="profile-hero-side">
          {role_names.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {role_names.map((role_name) => (
                <span key={role_name} className="profile-pill profile-pill-primary">
                  {role_name}
                </span>
              ))}
            </div>
          ) : null}
          {teams.length > 0 ? (
            <div className="profile-team-stack" aria-label={`Member of ${teams.length} ${teams.length === 1 ? "team" : "teams"}`}>
              {teams.slice(0, MAX_VISIBLE_TEAMS).map((team) => (
                <ProfileTooltip key={team.id} content={team.name} placement="bottom">
                  <span className="profile-team-avatar">
                    {team.picture_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={team.picture_url} alt="" />
                    ) : (
                      teamInitials(team.name)
                    )}
                  </span>
                </ProfileTooltip>
              ))}
              {teams.length > MAX_VISIBLE_TEAMS ? (
                <ProfileTooltip
                  content={teams
                    .slice(MAX_VISIBLE_TEAMS)
                    .map((team) => team.name)
                    .join(", ")}
                  placement="bottom"
                >
                  <span className="profile-team-avatar">+{teams.length - MAX_VISIBLE_TEAMS}</span>
                </ProfileTooltip>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {photo_error ? (
        <div className="px-8 pb-5">
          <ProfileBanner tone="error">{photo_error}</ProfileBanner>
        </div>
      ) : null}
    </header>
  );
};

export default ProfileHero;
