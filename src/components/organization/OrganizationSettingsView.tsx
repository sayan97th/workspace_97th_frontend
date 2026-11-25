"use client";
import React, { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AdminPageActions from "@/components/administration/AdminPageActions";
import { useAdminLeaveGuard } from "@/components/administration/AdminLeaveGuard";
import { useOrganizationSettings } from "./useOrganizationSettings";
import { ORGANIZATION_EDITOR_ROLES } from "./organization-routes";
import OrganizationLivePreview from "./OrganizationLivePreview";
import CompanyProfileCard from "./sections/CompanyProfileCard";
import LogoAssetsCard from "./sections/LogoAssetsCard";
import BrandColorCard from "./sections/BrandColorCard";
import ContactSupportCard from "./sections/ContactSupportCard";
import SocialProfilesCard from "./sections/SocialProfilesCard";
import SignInPageCard from "./sections/SignInPageCard";
import AnnouncementCard from "./sections/AnnouncementCard";
import HomeBannerCard from "./sections/HomeBannerCard";
import "./organization-settings.css";
import "./organization-rail.scss";

/** Card ids that deep links such as `?section=organization#contact` may target. */
const SECTION_IDS = ["profile", "logo", "colors", "home_banner", "contact", "social", "sign_in", "announcement"];

const UNSAVED_CHANGES_MESSAGE = "You have unsaved organization changes. Leave without saving them?";

const scrollToSection = (section_id: string) =>
  document.getElementById(section_id)?.scrollIntoView({ behavior: "smooth", block: "start" });

/**
 * Administration > Customization > Organization (`/administration?section=organization`): the
 * company's identity across the app. Company profile, logo and favicon (the logo replaces the
 * 97th Floor mark in the top left corner), brand color, contact and support details for the Help
 * menu, social profiles, the sign in page copy and an account wide announcement banner.
 *
 * Rendered inside the Administration view, which owns the page title, the role gate and the
 * scroll area. Form fields save together through the Save button in the page header, images
 * upload on their own. Staff can open it read only, the API only lets admins write.
 */
const OrganizationSettingsView: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const settings = useOrganizationSettings();
  const { draft, organization, is_dirty } = settings;
  const root_ref = useRef<HTMLDivElement>(null);
  const [rail_height, setRailHeight] = useState<number | null>(null);
  const is_ready = Boolean(draft && organization);
  const is_read_only = !settings.can_edit || !hasAnyRole(...ORGANIZATION_EDITOR_ROLES);
  const has_unsaved_changes = is_ready && !is_read_only && is_dirty;

  // Switching to another Administration page with unsaved edits asks first.
  useAdminLeaveGuard(has_unsaved_changes, UNSAVED_CHANGES_MESSAGE);

  // Deep links such as the Help menu's "Edit help resources" (`?section=organization#contact`).
  useEffect(() => {
    if (!is_ready) return;
    const section_id = window.location.hash.slice(1);
    if (SECTION_IDS.includes(section_id)) {
      window.requestAnimationFrame(() => scrollToSection(section_id));
    }
  }, [is_ready]);

  // The preview sticks inside the Administration scroll area, so its column is capped to the room
  // left within that area's padding and scrolls on its own instead of running past the bottom edge.
  useEffect(() => {
    if (!is_ready) return;
    const scroll_root = root_ref.current?.closest<HTMLElement>(".admin-page-content");
    if (!scroll_root) return;
    const measureRail = () => {
      const padding_top = parseFloat(getComputedStyle(scroll_root).paddingTop) || 0;
      setRailHeight(scroll_root.clientHeight - padding_top * 2);
    };
    const observer = new ResizeObserver(measureRail);
    observer.observe(scroll_root);
    return () => observer.disconnect();
  }, [is_ready]);

  // Closing or reloading the tab with unsaved edits asks first.
  useEffect(() => {
    if (!has_unsaved_changes) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [has_unsaved_changes]);

  if (settings.is_loading && !is_ready) {
    return <div className="text-[14px] text-shell-text-faint">Loading organization settings…</div>;
  }

  if (settings.load_error || !draft || !organization) {
    return (
      <div className="admin-notice admin-notice-error flex flex-wrap items-center justify-between gap-3">
        <span>
          <span className="font-semibold">The organization settings could not be loaded.</span>{" "}
          {settings.load_error ?? "Try again in a moment."}
        </span>
        <button type="button" onClick={settings.reload} className="admin-button admin-button-secondary">
          Try again
        </button>
      </div>
    );
  }

  const section_props = { draft, field_errors: settings.field_errors, setField: settings.setField, is_read_only };

  return (
    <div ref={root_ref} className="organization-settings">
      <AdminPageActions>
        {is_read_only ? (
          <span className="admin-pill admin-pill-info gap-1">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            View only
          </span>
        ) : has_unsaved_changes ? (
          <>
            <span className="organization-unsaved-label" role="status">
              <span className="organization-unsaved-dot" aria-hidden="true" />
              Unsaved changes
            </span>
            <button
              type="button"
              onClick={settings.discardChanges}
              disabled={settings.is_saving}
              className="admin-button admin-button-secondary"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => void settings.saveChanges()}
              disabled={settings.is_saving}
              className="admin-button admin-button-primary"
            >
              {settings.is_saving ? "Saving…" : "Save changes"}
            </button>
          </>
        ) : null}
      </AdminPageActions>

      {is_read_only ? (
        <div className="admin-notice admin-notice-info mb-6">You can view these settings. Only account admins can change them.</div>
      ) : null}

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <fieldset disabled={is_read_only} className="flex min-w-0 flex-col gap-5">
          <legend className="sr-only">Organization settings</legend>
          <CompanyProfileCard {...section_props} />
          <LogoAssetsCard
            {...section_props}
            organization={organization}
            busy_asset={settings.busy_asset}
            onUpload={(asset, file) => void settings.uploadAsset(asset, file)}
            onRemove={(asset) => void settings.removeAsset(asset)}
          />
          <BrandColorCard {...section_props} />
          <HomeBannerCard company_name={draft.company_name.trim() || organization.company_name} is_read_only={is_read_only} />
          <ContactSupportCard {...section_props} />
          <SocialProfilesCard {...section_props} setSocialLink={settings.setSocialLink} />
          <SignInPageCard {...section_props} />
          <AnnouncementCard {...section_props} />
        </fieldset>

        <aside
          className="organization-rail"
          style={rail_height ? ({ "--organization-rail-height": `${rail_height}px` } as React.CSSProperties) : undefined}
        >
          <OrganizationLivePreview organization={organization} draft={draft} />
        </aside>
      </div>
    </div>
  );
};

export default OrganizationSettingsView;
