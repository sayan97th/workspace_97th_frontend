import { describe, expect, it } from "vitest";
import type { OrganizationDto } from "@/types/organization";
import { buildUpdatePayload, toFormValues, validateDraft } from "@/components/organization/organization-form";

const organization: OrganizationDto = {
  company_name: "97th Floor",
  account_url: "97thfloor",
  company_legal_name: null,
  company_tagline: null,
  company_description: null,
  company_industry: null,
  company_size: null,
  company_founded_year: 2005,
  company_website: null,
  support_email: null,
  support_url: null,
  contact_phone: null,
  address_line_1: null,
  address_line_2: null,
  address_city: null,
  address_state: null,
  address_postal_code: null,
  address_country: null,
  social_links: { linkedin: "https://linkedin.com/company/97th", x: null, facebook: null, instagram: null, youtube: null },
  logo_url: null,
  logo_dark_url: null,
  favicon_url: null,
  brand_color: null,
  show_name_in_top_bar: false,
  login_headline: null,
  login_message: null,
  announcement_enabled: false,
  announcement_message: null,
  announcement_tone: "info",
  announcement_link_label: null,
  announcement_link_url: null,
  announcement_dismissible: true,
  announcement_published_at: null,
  can_edit: true,
  updated_at: "2026-10-10T00:00:00Z",
};

describe("organization form", () => {
  it("sends nothing when the draft matches the saved values", () => {
    const saved = toFormValues(organization);
    expect(buildUpdatePayload(saved, { ...saved, company_tagline: "   " })).toEqual({});
  });

  it("sends only the changed fields, with empty text as null", () => {
    const saved = toFormValues(organization);
    const draft = {
      ...saved,
      company_name: " Acme ",
      company_founded_year: "",
      show_name_in_top_bar: true,
      social_links: { ...saved.social_links, linkedin: "", x: "https://x.com/acme" },
    };

    expect(buildUpdatePayload(saved, draft)).toEqual({
      company_name: "Acme",
      company_founded_year: null,
      show_name_in_top_bar: true,
      social_links: { linkedin: null, x: "https://x.com/acme", facebook: null, instagram: null, youtube: null },
    });
  });

  it("catches the obvious mistakes before saving", () => {
    const draft = {
      ...toFormValues(organization),
      company_name: "",
      brand_color: "#12",
      announcement_enabled: true,
      announcement_link_url: "https://acme.test",
    };

    expect(Object.keys(validateDraft(draft)).sort()).toEqual([
      "announcement_link_label",
      "announcement_message",
      "brand_color",
      "company_name",
    ]);
  });
});
