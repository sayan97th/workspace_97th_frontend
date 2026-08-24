"use client";
import React, { useState } from "react";
import SettingsCollapsibleCard from "../SettingsCollapsibleCard";
import SettingsToggleRow from "../SettingsToggleRow";
import SettingsDropdown from "../SettingsDropdown";
import { DEFAULT_PRODUCT_OPTIONS, type AuthenticationSettingsManagerApi } from "../useAuthenticationSettingsManager";

export type AuthenticationSectionProps = {
  authentication: AuthenticationSettingsManagerApi;
};

const textAreaClass =
  "w-full rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-[13px] py-[11px] text-[13px] text-shell-text outline-none focus:border-brand-500";

const default_product_options = DEFAULT_PRODUCT_OPTIONS.map((product) => ({ id: product, label: product }));

/** Administration > Security > Authentication — sign-in policies, SCIM, guest approval and IP restriction. */
const AuthenticationSection: React.FC<AuthenticationSectionProps> = ({ authentication }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!authentication.scim_token) return;
    await navigator.clipboard.writeText(authentication.scim_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (authentication.is_loading) {
    return <div className="text-[13px] text-shell-text-faint">Loading authentication settings…</div>;
  }

  return (
    <div className="max-w-[700px]">
      <p className="mb-6 text-[13px] leading-relaxed text-shell-text-muted">
        Control how people sign up for and log into this account.
      </p>

      {authentication.error ? (
        <div className="mb-5 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
          {authentication.error}
        </div>
      ) : null}

      <div className="mb-3 flex flex-col gap-3">
        <SettingsCollapsibleCard title="Authentication policies" default_open>
          <SettingsToggleRow
            label="Require two-factor authentication"
            description="Members without two-factor authentication set up will be asked to enable it at their next sign-in."
            is_on={authentication.two_factor_enforced}
            onToggle={authentication.toggleTwoFactor}
          />
          <SettingsToggleRow
            label="Sign in with Google"
            description="Let members sign in using their Google account."
            is_on={authentication.google_sso_enabled}
            onToggle={authentication.toggleGoogleSso}
          />
          <SettingsToggleRow
            label="SAML single sign-on"
            description="Connect an identity provider so members sign in through your SSO. Configuration only, this does not yet connect to a live identity provider."
            is_on={authentication.saml_sso_enabled}
            onToggle={authentication.toggleSamlSso}
          />
        </SettingsCollapsibleCard>

        <SettingsCollapsibleCard title="Manage users and teams remotely (SCIM)">
          <SettingsToggleRow
            label="Enable SCIM provisioning"
            description="Reserves a token for your identity provider's SCIM client. Configuration only, this does not yet run a live SCIM server."
            is_on={authentication.scim_enabled}
            onToggle={authentication.toggleScim}
          />
          {authentication.scim_enabled ? (
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-shell-text-muted">API token</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={authentication.scim_token ?? "Only visible to admins"}
                  className="flex-1 rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-[13px] py-[10px] font-mono text-[12.5px] text-shell-text-secondary outline-none"
                />
                {authentication.scim_token ? (
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="flex-none rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-3.5 py-[9px] text-[12.5px] font-semibold text-shell-text-secondary hover:bg-shell-hover"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void authentication.rotateScimToken()}
                  disabled={authentication.is_rotating_scim_token}
                  className="flex-none rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-3.5 py-[9px] text-[12.5px] font-semibold text-shell-text-secondary hover:bg-shell-hover disabled:cursor-default disabled:opacity-50"
                >
                  {authentication.is_rotating_scim_token
                    ? "Rotating…"
                    : authentication.scim_token
                      ? "Rotate"
                      : "Generate"}
                </button>
              </div>
            </div>
          ) : null}
        </SettingsCollapsibleCard>

        <SettingsCollapsibleCard title="Guests invite domain approval">
          <SettingsToggleRow
            label="Require approval for guest invites"
            description="Invitations sent to a guest outside the approved domains below will be blocked."
            is_on={authentication.guest_approval_enabled}
            onToggle={authentication.toggleGuestApproval}
          />
          <div>
            <div className="mb-1.5 text-[12px] font-semibold text-shell-text-muted">Approved domains</div>
            <input
              type="text"
              value={authentication.approved_domains}
              onChange={(event) => authentication.setApprovedDomains(event.target.value)}
              placeholder="e.g. workspace97.app, partner.com"
              className={textAreaClass}
            />
          </div>
        </SettingsCollapsibleCard>

        <SettingsCollapsibleCard title="IP address restriction">
          <SettingsToggleRow
            label="Restrict access by IP"
            description="Only allow sign-in from the IP ranges listed below."
            is_on={authentication.ip_restriction_enabled}
            onToggle={authentication.toggleIpRestriction}
          />
          <div>
            <div className="mb-1.5 text-[12px] font-semibold text-shell-text-muted">Allowed IP ranges</div>
            <textarea
              value={authentication.ip_ranges}
              onChange={(event) => authentication.setIpRanges(event.target.value)}
              placeholder="One range per line, e.g. 203.0.113.0/24"
              rows={3}
              className={`${textAreaClass} resize-y font-mono`}
            />
          </div>
        </SettingsCollapsibleCard>
      </div>

      <div className="my-6 h-px bg-shell-hover" />

      <div className="mb-1.5 text-[15px] font-bold text-shell-text">Default product for new users</div>
      <p className="mb-4 max-w-[460px] text-[13px] leading-relaxed text-shell-text-muted">
        Users who aren&apos;t directly assigned to a product will automatically be added to this one.
      </p>
      <SettingsDropdown
        value={authentication.default_product}
        options={default_product_options}
        onChange={authentication.setDefaultProduct}
        className="w-[220px]"
      />
    </div>
  );
};

export default AuthenticationSection;
