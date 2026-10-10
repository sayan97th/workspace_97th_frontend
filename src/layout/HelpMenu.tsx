"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Building2, Globe, LifeBuoy, Mail } from "lucide-react";
import ActionMenu, { type ActionMenuItem, type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { ORGANIZATION_SETTINGS_PATH, ORGANIZATION_EDITOR_ROLES } from "@/components/organization/organization-routes";

type HelpMenuProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
};

const openInNewTab = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

const menu_icon_class = "h-4 w-4";

/**
 * The top bar's Help (?) menu, built from the help center, support email and website an admin
 * set in Administration > Organization > Contact and support.
 */
const HelpMenu: React.FC<HelpMenuProps> = ({ anchor_el, is_open, onClose }) => {
  const router = useRouter();
  const { hasAnyRole } = useAuth();
  const { branding } = useBranding();
  const can_edit_organization = hasAnyRole(...ORGANIZATION_EDITOR_ROLES);

  const help_items: ActionMenuItem[] = [];
  if (branding.support_url) {
    const support_url = branding.support_url;
    help_items.push({ key: "help_center", label: "Help center", icon: <LifeBuoy className={menu_icon_class} />, onClick: () => openInNewTab(support_url) });
  }
  if (branding.support_email) {
    const support_email = branding.support_email;
    help_items.push({
      key: "contact_support",
      label: "Contact support",
      icon: <Mail className={menu_icon_class} />,
      onClick: () => {
        window.location.href = `mailto:${support_email}`;
      },
    });
  }
  if (branding.company_website) {
    const company_website = branding.company_website;
    help_items.push({
      key: "company_website",
      label: `${branding.company_name} website`,
      icon: <Globe className={menu_icon_class} />,
      onClick: () => openInNewTab(company_website),
    });
  }
  if (help_items.length === 0) {
    help_items.push({
      key: "no_help_links",
      label: "No help resources yet",
      icon: <LifeBuoy className={menu_icon_class} />,
      disabled: true,
      disabled_reason: "An admin can add a help center and a support email in Organization settings.",
    });
  }

  const sections: ActionMenuSection[] = [{ key: "help", items: help_items }];
  if (can_edit_organization) {
    sections.push({
      key: "manage",
      items: [
        {
          key: "edit_help_links",
          label: "Edit help resources",
          icon: <Building2 className={menu_icon_class} />,
          onClick: () => router.push(`${ORGANIZATION_SETTINGS_PATH}#contact`),
        },
      ],
    });
  }

  return (
    <ActionMenu
      anchor_el={anchor_el}
      is_open={is_open}
      onClose={onClose}
      sections={sections}
      aria_label="Help"
      title="Help and support"
      width={248}
      align="end"
    />
  );
};

export default HelpMenu;
