"use client";
import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ProfileTabs from "./ProfileTabs";
import ProfileBanner from "./ProfileBanner";
import ProfileHero from "./ProfileHero";
import { useProfileManager } from "./useProfileManager";
import { useProfileOverview } from "./useProfileOverview";
import { PROFILE_SECTION_IDS, findProfileNavItem } from "./profileNavConfig";
import type { ProfileSectionId } from "./types";
import PersonalInfoSection from "./sections/PersonalInfoSection";
import WorkingStatusSection from "./sections/WorkingStatusSection";
import NotificationsSection from "./sections/NotificationsSection";
import LanguageRegionSection from "./sections/LanguageRegionSection";
import PasswordSection from "./sections/PasswordSection";
import SessionHistorySection from "./sections/SessionHistorySection";
import "./profile.scss";

/**
 * "My Profile" page, mounted at `/profile` and styled after monday.com's profile: an identity
 * header ({@link ProfileHero}) over a soft gray page, the section rail ({@link ProfileTabs}) on
 * the left and the active section inside a white card with its title and subtitle. Every
 * section is still driven by {@link useProfileManager}. Styles live in `profile.scss`.
 */
const ProfileView: React.FC = () => {
  const router = useRouter();
  const search_params = useSearchParams();
  const profile = useProfileManager();
  const { overview } = useProfileOverview();

  // Deep-link support for `/profile?section=notifications`, e.g. the board options menu's
  // "Notifications" row, which sends the user here instead of duplicating the preferences UI.
  useEffect(() => {
    const section = search_params.get("section");
    if (PROFILE_SECTION_IDS.includes(section as ProfileSectionId)) {
      profile.selectSection(section as ProfileSectionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search_params]);

  const active_item = findProfileNavItem(profile.active_section);

  const renderActiveSection = () => {
    switch (profile.active_section) {
      case "personal":
        return <PersonalInfoSection profile={profile} overview={overview} onOpenTeams={() => router.push("/teams")} />;
      case "working":
        return <WorkingStatusSection profile={profile} />;
      case "notifications":
        return <NotificationsSection profile={profile} />;
      case "language":
        return <LanguageRegionSection profile={profile} />;
      case "password":
        return <PasswordSection />;
      case "sessions":
        return <SessionHistorySection profile={profile} />;
      default:
        return null;
    }
  };

  return (
    <div className="profile-shell profile-theme">
      <div className="profile-container">
        <button type="button" onClick={() => router.back()} className="profile-back-button">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          Back
        </button>

        <ProfileHero
          overview={overview}
          working_status={profile.working_status}
          status_options={profile.status_options}
          onSelectSection={profile.selectSection}
        />

        <div className="profile-body">
          <ProfileTabs active_section={profile.active_section} onSelect={profile.selectSection} />

          <section
            id="profile-section-panel"
            role="tabpanel"
            aria-labelledby="profile-card-title"
            className="profile-card"
          >
            <div className="profile-card-header">
              <h2 id="profile-card-title" className="profile-card-title">
                {active_item.title ?? active_item.label}
              </h2>
              <p className="profile-card-subtitle">{active_item.description}</p>
            </div>

            <div key={profile.active_section} className="profile-card-content">
              {profile.preferences_error ? (
                <ProfileBanner tone="error" className="mb-6">
                  {profile.preferences_error}
                </ProfileBanner>
              ) : null}
              {renderActiveSection()}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
