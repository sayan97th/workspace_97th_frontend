"use client";
import React from "react";
import type { AdministrationManagerApi } from "../useAdministrationManager";
import SettingsCollapsibleCard from "../SettingsCollapsibleCard";
import SettingsToggleRow from "../SettingsToggleRow";
import SettingsDropdown from "../SettingsDropdown";
import { ADMIN_DEFAULT_PRODUCT_OPTIONS } from "@/data/administration-data";

export type AuthenticationSectionProps = {
  admin: AdministrationManagerApi;
};

const textAreaClass =
  "w-full rounded-[9px] border border-white/[0.12] bg-[#142020] px-[13px] py-[11px] text-[13px] text-[#e9eded] outline-none focus:border-brand-500";

const default_product_options = ADMIN_DEFAULT_PRODUCT_OPTIONS.map((product) => ({ id: product, label: product }));

/** Administration > Security > Authentication — sign-in policies, SCIM, guest approval and IP restriction. */
const AuthenticationSection: React.FC<AuthenticationSectionProps> = ({ admin }) => (
  <div className="max-w-[700px]">
    <p className="mb-6 text-[13px] leading-relaxed text-[#9aa4a5]">
      Control how people sign up for and log into this account.
    </p>

    <div className="mb-3 flex flex-col gap-3">
      <SettingsCollapsibleCard title="Authentication policies" default_open>
        <SettingsToggleRow
          label="Two-factor authentication"
          description="Require a one-time code from an authenticator app at login."
          is_on={admin.two_factor_enabled}
          onToggle={admin.toggleTwoFactor}
        />
        <SettingsToggleRow
          label="Sign in with Google"
          description="Let members sign in using their Google account."
          is_on={admin.google_sso_enabled}
          onToggle={admin.toggleGoogleSso}
        />
        <SettingsToggleRow
          label="SAML single sign-on"
          description="Connect an identity provider so members sign in through your SSO."
          is_on={admin.saml_sso_enabled}
          onToggle={admin.toggleSamlSso}
        />
      </SettingsCollapsibleCard>

      <SettingsCollapsibleCard title="Manage users and teams remotely (SCIM)">
        <SettingsToggleRow
          label="Enable SCIM provisioning"
          description="Add, deactivate, and update users and teams from your identity provider or API."
          is_on={admin.scim_enabled}
          onToggle={admin.toggleScim}
        />
        {admin.scim_enabled ? (
          <div>
            <div className="mb-1.5 text-[12px] font-semibold text-[#9aa4a5]">API token</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value="scim_live_9f2c1a7bd8e4"
                className="flex-1 rounded-[9px] border border-white/[0.12] bg-[#142020] px-[13px] py-[10px] font-mono text-[12.5px] text-[#b7c0c0] outline-none"
              />
              <button
                type="button"
                className="flex-none rounded-[9px] border border-white/[0.12] bg-[#142020] px-3.5 py-[9px] text-[12.5px] font-semibold text-[#d7dcdc] hover:bg-white/[0.08]"
              >
                Copy
              </button>
            </div>
          </div>
        ) : null}
      </SettingsCollapsibleCard>

      <SettingsCollapsibleCard title="Guests invite domain approval">
        <SettingsToggleRow
          label="Require approval for guest invites"
          description="Members inviting a guest outside the approved domains will need admin sign-off."
          is_on={admin.guest_approval_enabled}
          onToggle={admin.toggleGuestApproval}
        />
        <div>
          <div className="mb-1.5 text-[12px] font-semibold text-[#9aa4a5]">Approved domains</div>
          <input
            type="text"
            value={admin.approved_domains}
            onChange={(event) => admin.setApprovedDomains(event.target.value)}
            placeholder="e.g. workspace97.app, partner.com"
            className={textAreaClass}
          />
        </div>
      </SettingsCollapsibleCard>

      <SettingsCollapsibleCard title="IP address restriction">
        <SettingsToggleRow
          label="Restrict access by IP"
          description="Only allow sign-in from the IP ranges listed below."
          is_on={admin.ip_restriction_enabled}
          onToggle={admin.toggleIpRestriction}
        />
        <div>
          <div className="mb-1.5 text-[12px] font-semibold text-[#9aa4a5]">Allowed IP ranges</div>
          <textarea
            value={admin.ip_ranges}
            onChange={(event) => admin.setIpRanges(event.target.value)}
            placeholder="One range per line, e.g. 203.0.113.0/24"
            rows={3}
            className={`${textAreaClass} resize-y font-mono`}
          />
        </div>
      </SettingsCollapsibleCard>
    </div>

    <div className="my-6 h-px bg-white/[0.07]" />

    <div className="mb-1.5 text-[15px] font-bold text-[#edf1f1]">Default product for new users</div>
    <p className="mb-4 max-w-[460px] text-[13px] leading-relaxed text-[#9aa4a5]">
      Users who aren&apos;t directly assigned to a product will automatically be added to this one.
    </p>
    <SettingsDropdown
      value={admin.default_product}
      options={default_product_options}
      onChange={admin.setDefaultProduct}
      className="w-[220px]"
    />
  </div>
);

export default AuthenticationSection;
