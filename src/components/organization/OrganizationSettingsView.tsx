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
import "./organization-settings.css";

/** The cards of the page in order, also the "On this page" links. */
const PAGE_SECTIONS = [
  { id: "profile", label: "Company profile" },
  { id: "logo", label: "Logo and favicon" },
  { id: "colors", label: "Brand color" },
  { id: "contact", label: "Contact and support" },
  { id: "social", label: "Social profiles" },
  { id: "sign_in", label: "Sign in page" },
  { id: "announcement", label: "Announcement banner" },
];

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
  const [active_section_id, setActiveSectionId] = useState(PAGE_SECTIONS[0].id);
  const root_ref = useRef<HTMLDivElement>(null);
  const is_ready = Boolean(draft && organization);
  const is_read_only = !settings.can_edit || !hasAnyRole(...ORGANIZATION_EDITOR_ROLES);
  const has_unsaved_changes = is_ready && !is_read_only && is_dirty;

  // Switching to another Administration page with unsaved edits asks first.
  useAdminLeaveGuard(has_unsaved_changes, UNSAVED_CHANGES_MESSAGE);

  // Deep links such as the Help menu's "Edit help resources" (`?section=organization#contact`).
  useEffect(() => {
    if (!is_ready) return;
    const section_id = window.location.hash.slice(1);
    if (PAGE_SECTIONS.some((section) => section.id === section_id)) {
      window.requestAnimationFrame(() => scrollToSection(section_id));
    }
  }, [is_ready]);

  // Highlights the card currently in view in the "On this page" list. The cards scroll inside the
  // Administration card, not the window, so that scroll area is the observer's root.
  useEffect(() => {
    if (!is_ready) return;
    const scroll_root = root_ref.current?.closest<HTMLElement>(".admin-page-content") ?? null;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible_entry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => first.boundingClientRect.top - second.boundingClientRect.top)[0];
        if (visible_entry) setActiveSectionId(visible_entry.target.id);
      },
      { root: scroll_root, rootMargin: "-10% 0px -70% 0px" }
    );
    PAGE_SECTIONS.forEach(({ id }) => {
      const section_el = document.getElementById(id);
      if (section_el) observer.observe(section_el);
    });
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
          <ContactSupportCard {...section_props} />
          <SocialProfilesCard {...section_props} setSocialLink={settings.setSocialLink} />
          <SignInPageCard {...section_props} />
          <AnnouncementCard {...section_props} />
        </fieldset>

        <aside className="hidden flex-col gap-5 xl:sticky xl:top-0 xl:flex">
          <nav aria-label="On this page" className="organization-panel p-2">
            <div className="px-2.5 pb-1 pt-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-shell-text-faint">
              On this page
            </div>
            {PAGE_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  setActiveSectionId(section.id);
                  // Keeps `?section=organization` and only swaps the hash, so a refresh lands on the same card.
                  window.history.replaceState(window.history.state, "", `#${section.id}`);
                  scrollToSection(section.id);
                }}
                aria-current={active_section_id === section.id ? "location" : undefined}
                className="organization-toc-link"
              >
                {section.label}
              </a>
            ))}
          </nav>
          <OrganizationLivePreview organization={organization} draft={draft} />
        </aside>
      </div>
    </div>
  );
};

export default OrganizationSettingsView;
