"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { useAuth } from "@/context/AuthContext";
import { ChevronRightIcon } from "@/icons/workspace-icons";
import { useOrganizationSettings } from "./useOrganizationSettings";
import { ORGANIZATION_EDITOR_ROLES, ORGANIZATION_VIEWER_ROLES } from "./organization-routes";
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

const scrollToSection = (section_id: string) =>
  document.getElementById(section_id)?.scrollIntoView({ behavior: "smooth", block: "start" });

/**
 * Administration > Organization (`/admin/organization`): the company's identity across the
 * app. Company profile, logo and favicon (the logo replaces the 97th Floor mark in the top left
 * corner), brand color, contact and support details for the Help menu, social profiles, the
 * sign in page copy and an account wide announcement banner.
 *
 * Form fields save together through the sticky save bar, images upload on their own. Staff can
 * open the page read only, the API only lets admins write.
 */
const OrganizationSettingsView: React.FC = () => {
  const router = useRouter();
  const { isLoading: is_auth_loading, hasAnyRole } = useAuth();
  const settings = useOrganizationSettings();
  const { draft, organization, is_dirty } = settings;
  const [active_section_id, setActiveSectionId] = useState(PAGE_SECTIONS[0].id);
  const is_ready = Boolean(draft && organization);

  // Deep links such as the Help menu's "Edit help resources" (`/admin/organization#contact`).
  useEffect(() => {
    if (!is_ready) return;
    const section_id = window.location.hash.slice(1);
    if (PAGE_SECTIONS.some((section) => section.id === section_id)) {
      window.requestAnimationFrame(() => scrollToSection(section_id));
    }
  }, [is_ready]);

  // Highlights the card currently in view in the "On this page" list.
  useEffect(() => {
    if (!is_ready) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible_entry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => first.boundingClientRect.top - second.boundingClientRect.top)[0];
        if (visible_entry) setActiveSectionId(visible_entry.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    PAGE_SECTIONS.forEach(({ id }) => {
      const section_el = document.getElementById(id);
      if (section_el) observer.observe(section_el);
    });
    return () => observer.disconnect();
  }, [is_ready]);

  // Closing the tab with unsaved edits asks first.
  useEffect(() => {
    if (!is_dirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [is_dirty]);

  if (is_auth_loading) return <BoardLoadingSpinner />;

  if (!hasAnyRole(...ORGANIZATION_VIEWER_ROLES)) {
    return (
      <CenteredMessage
        title="You don't have access to this page"
        detail="Only account administrators and staff can view the organization settings."
      />
    );
  }

  if (settings.is_loading && !is_ready) return <BoardLoadingSpinner />;

  if (settings.load_error || !draft || !organization) {
    return (
      <CenteredMessage
        title="The organization settings could not be loaded"
        detail={settings.load_error ?? "Try again in a moment."}
        action={
          <button
            type="button"
            onClick={settings.reload}
            className="rounded-md bg-brand-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-600"
          >
            Try again
          </button>
        }
      />
    );
  }

  const is_read_only = !settings.can_edit || !hasAnyRole(...ORGANIZATION_EDITOR_ROLES);
  const section_props = { draft, field_errors: settings.field_errors, setField: settings.setField, is_read_only };

  return (
    <div className="organization-settings-theme min-h-full bg-shell-bg text-shell-text">
      <div className="flex items-center gap-3 border-b border-shell-border px-6 py-3.5">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-shell-text-muted transition-colors hover:text-shell-text"
        >
          <ChevronRightIcon className="rotate-180" size={11} />
          Back
        </button>
        <span className="h-4 w-px bg-shell-border" aria-hidden="true" />
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] font-medium text-shell-text-muted">
          <Link href="/administration" className="hover:text-shell-text hover:underline">
            Administration
          </Link>
          <ChevronRightIcon size={9} />
          <span className="text-shell-text">Organization</span>
        </nav>
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-6 pb-8 pt-8 lg:px-10">
        <div className="mb-7">
          <h1 className="font-heading text-page-title text-shell-text">Organization</h1>
          <p className="mt-1 max-w-[640px] text-[14px] leading-relaxed text-shell-text-muted">
            Brand the whole workspace with your company&apos;s identity: the logo in the top left corner, colors,
            favicon, contact details, the sign in page and announcements.
          </p>
        </div>

        {is_read_only ? (
          <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-shell-border bg-shell-panel-alt px-4 py-3 text-[13px] text-shell-text-secondary">
            <Eye className="h-4 w-4 flex-none" aria-hidden="true" />
            You can view these settings. Only account admins can change them.
          </div>
        ) : null}

        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <fieldset disabled={is_read_only} className="flex min-w-0 flex-col gap-6">
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

          <aside className="hidden flex-col gap-5 xl:sticky xl:top-6 xl:flex">
            <nav aria-label="On this page" className="rounded-xl border border-shell-border bg-shell-panel p-2">
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
                    window.history.replaceState(null, "", `#${section.id}`);
                    scrollToSection(section.id);
                  }}
                  aria-current={active_section_id === section.id ? "location" : undefined}
                  className={`block rounded-md px-2.5 py-1.5 text-[13.5px] transition-colors ${
                    active_section_id === section.id
                      ? "bg-[#cce5ff] font-medium text-shell-text dark:bg-[#579bfc]/20"
                      : "text-shell-text-secondary hover:bg-shell-hover"
                  }`}
                >
                  {section.label}
                </a>
              ))}
            </nav>
            <OrganizationLivePreview organization={organization} draft={draft} />
          </aside>
        </div>
      </div>

      {!is_read_only && is_dirty ? (
        <div className="sticky bottom-0 z-10 border-t border-shell-border bg-shell-panel/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-6 py-3 lg:px-10">
            <span className="flex items-center gap-2 text-[13.5px] font-medium text-shell-text">
              <span className="h-2 w-2 rounded-full bg-[#fdab3d]" aria-hidden="true" />
              You have unsaved changes
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={settings.discardChanges}
                disabled={settings.is_saving}
                className="h-9 rounded-md px-4 text-[13.5px] font-medium text-shell-text transition-colors hover:bg-shell-hover disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => void settings.saveChanges()}
                disabled={settings.is_saving}
                className="h-9 rounded-md bg-brand-500 px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
              >
                {settings.is_saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OrganizationSettingsView;
