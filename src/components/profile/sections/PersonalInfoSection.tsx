"use client";
import React from "react";
import { format } from "date-fns";
import { BadgeCheck, Briefcase, Building2, CalendarDays, Clock, Mail, Phone, UserRound, Users } from "lucide-react";
import { SettingsDropdown } from "@/components/administration";
import { useAuth } from "@/context/AuthContext";
import { profileService } from "@/services/profile.service";
import { timezone_options } from "@/data/timezone-options";
import type { ApiError, PartialProfileData, ProfileOverview } from "@/types/auth";
import ProfileInlineField from "../ProfileInlineField";
import { ProfileSettingGroup } from "../ProfileSettingRow";
import ProfileTooltip from "../ProfileTooltip";
import type { ProfileManagerApi } from "../useProfileManager";

export type PersonalInfoSectionProps = {
  profile: ProfileManagerApi;
  overview: ProfileOverview | null;
  /** Opens the Teams directory. */
  onOpenTeams?: () => void;
};

const ICON_PROPS = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

const TIMEZONE_DROPDOWN_OPTIONS = timezone_options.map((option) => ({ id: option.value, label: option.label }));

/** First validation message for the field, else the API message, as an Error the inline field can show. */
const toFieldError = (error: unknown, field: keyof PartialProfileData): Error => {
  const api_error = error as ApiError;
  return new Error(api_error?.errors?.[field]?.[0] ?? api_error?.message ?? "Could not save this field. Please try again.");
};

/**
 * My Profile > Personal info, monday style overview: every detail is a row with an icon and a value
 * that is edited in place and saved on its own through `PATCH /api/profile`. The photo is changed
 * from the page header. Below it, read only account details: department, teams, role and join date.
 */
const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({ profile, overview, onOpenTeams }) => {
  const { user, refreshUser } = useAuth();

  const saveField = (field: keyof PartialProfileData) => async (value: string) => {
    try {
      await profileService.patchUserProfile({ [field]: value || null });
      await refreshUser();
    } catch (error) {
      throw toFieldError(error, field);
    }
  };

  const role_names = (user?.roles ?? []).map((role) =>
    typeof role === "string" ? role.replace(/_/g, " ") : role.display_name || role.name.replace(/_/g, " ")
  );
  const member_since = user?.created_at ? format(new Date(user.created_at), "MMMM d, yyyy") : null;
  const teams = overview?.teams ?? [];

  return (
    <div>
      <ProfileSettingGroup title="Overview" description="Click any detail to edit it. Changes are saved as soon as you leave the field.">
        <ProfileInlineField
          icon={<UserRound {...ICON_PROPS} />}
          label="First name"
          value={user?.first_name ?? ""}
          placeholder="Add your first name"
          required_message="Your first name is required."
          onSave={saveField("first_name")}
        />
        <ProfileInlineField
          icon={<UserRound {...ICON_PROPS} />}
          label="Last name"
          value={user?.last_name ?? ""}
          placeholder="Add your last name"
          required_message="Your last name is required."
          onSave={saveField("last_name")}
        />
        <ProfileInlineField
          icon={<Briefcase {...ICON_PROPS} />}
          label="Title"
          value={user?.job_title ?? ""}
          placeholder="Add your title, for example Product Designer"
          onSave={saveField("job_title")}
        />
        <ProfileInlineField
          icon={<Mail {...ICON_PROPS} />}
          label="Email"
          input_type="email"
          value={user?.email ?? ""}
          placeholder="Add your email"
          required_message="Your email is required."
          onSave={saveField("email")}
        />
        <ProfileInlineField
          icon={<Phone {...ICON_PROPS} />}
          label="Phone"
          input_type="tel"
          max_length={30}
          value={user?.phone ?? ""}
          placeholder="Add a phone number"
          onSave={saveField("phone")}
        />
        <div className="profile-field">
          <span className="profile-field-label">
            <Clock {...ICON_PROPS} />
            Time zone
          </span>
          <div className="profile-field-value">
            <SettingsDropdown
              value={profile.region_timezone || null}
              options={TIMEZONE_DROPDOWN_OPTIONS}
              onChange={profile.setRegionTimezone}
              placeholder="Select your time zone"
              className="w-full max-w-[420px]"
            />
          </div>
        </div>
      </ProfileSettingGroup>

      <ProfileSettingGroup title="Account" description="Managed by your account administrators.">
        <div className="profile-field">
          <span className="profile-field-label">
            <Building2 {...ICON_PROPS} />
            Department
          </span>
          <div className="profile-field-value px-2.5">
            {overview?.department ? (
              overview.department.name
            ) : (
              <span className="profile-inline-placeholder">No department assigned</span>
            )}
          </div>
        </div>
        <div className="profile-field">
          <span className="profile-field-label">
            <Users {...ICON_PROPS} />
            Teams
          </span>
          <div className="profile-field-value flex flex-wrap items-center gap-1.5 px-2.5 py-1">
            {teams.map((team) => (
              <ProfileTooltip
                key={team.id}
                content={`${team.members_count} ${team.members_count === 1 ? "member" : "members"}`}
              >
                <span className="profile-pill">{team.name}</span>
              </ProfileTooltip>
            ))}
            {teams.length === 0 ? <span className="profile-inline-placeholder">Not on a team yet</span> : null}
            {onOpenTeams ? (
              <button type="button" onClick={onOpenTeams} className="profile-link ml-1">
                {teams.length === 0 ? "Explore teams" : "View all teams"}
              </button>
            ) : null}
          </div>
        </div>
        <div className="profile-field">
          <span className="profile-field-label">
            <BadgeCheck {...ICON_PROPS} />
            Role
          </span>
          <div className="profile-field-value flex flex-wrap gap-1.5 px-2.5">
            {role_names.length > 0 ? (
              role_names.map((role_name) => (
                <span key={role_name} className="profile-pill profile-pill-primary">
                  {role_name}
                </span>
              ))
            ) : (
              <span className="profile-inline-placeholder">Member</span>
            )}
          </div>
        </div>
        {member_since ? (
          <div className="profile-field">
            <span className="profile-field-label">
              <CalendarDays {...ICON_PROPS} />
              Member since
            </span>
            <div className="profile-field-value px-2.5">{member_since}</div>
          </div>
        ) : null}
      </ProfileSettingGroup>
    </div>
  );
};

export default PersonalInfoSection;
