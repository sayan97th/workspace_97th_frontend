import type {
  AnnouncementTone,
  CompanySize,
  OrganizationDto,
  SocialNetwork,
  UpdateOrganizationPayload,
} from "@/types/organization";

/** Every text field of the Organization form, edited as plain strings and sent as `string | null`. */
export const ORGANIZATION_TEXT_FIELDS = [
  "company_name",
  "company_legal_name",
  "company_tagline",
  "company_description",
  "company_industry",
  "company_size",
  "company_website",
  "support_email",
  "support_url",
  "contact_phone",
  "address_line_1",
  "address_line_2",
  "address_city",
  "address_state",
  "address_postal_code",
  "address_country",
  "brand_color",
  "login_headline",
  "login_message",
  "announcement_message",
  "announcement_link_label",
  "announcement_link_url",
] as const;

export type OrganizationTextField = (typeof ORGANIZATION_TEXT_FIELDS)[number];

export const ORGANIZATION_BOOLEAN_FIELDS = [
  "show_name_in_top_bar",
  "announcement_enabled",
  "announcement_dismissible",
] as const;

export type OrganizationBooleanField = (typeof ORGANIZATION_BOOLEAN_FIELDS)[number];

/** The draft the page edits: inputs hold strings, toggles booleans. */
export type OrganizationFormValues = Record<OrganizationTextField, string> &
  Record<OrganizationBooleanField, boolean> & {
    company_founded_year: string;
    announcement_tone: AnnouncementTone;
    social_links: Record<SocialNetwork, string>;
  };

export const SOCIAL_NETWORKS: { id: SocialNetwork; label: string; placeholder: string }[] = [
  { id: "linkedin", label: "LinkedIn", placeholder: "https://www.linkedin.com/company/your-company" },
  { id: "x", label: "X", placeholder: "https://x.com/yourcompany" },
  { id: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/yourcompany" },
  { id: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/yourcompany" },
  { id: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/@yourcompany" },
];

export const COMPANY_SIZE_OPTIONS: { id: CompanySize; label: string }[] = [
  { id: "1-10", label: "1 to 10 employees" },
  { id: "11-50", label: "11 to 50 employees" },
  { id: "51-200", label: "51 to 200 employees" },
  { id: "201-500", label: "201 to 500 employees" },
  { id: "501-1000", label: "501 to 1,000 employees" },
  { id: "1001+", label: "More than 1,000 employees" },
];

export const INDUSTRY_OPTIONS: { id: string; label: string }[] = [
  "Marketing and advertising",
  "Software and technology",
  "Professional services",
  "Consulting",
  "Media and publishing",
  "Ecommerce and retail",
  "Financial services",
  "Healthcare",
  "Education",
  "Real estate",
  "Manufacturing",
  "Hospitality and travel",
  "Nonprofit",
  "Government",
  "Other",
].map((label) => ({ id: label, label }));

/** ISO 3166-1 alpha-2 codes, named in English through `Intl.DisplayNames`. */
const COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PR PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW".split(
    " "
  );

export const countryOptions = (): { id: string; label: string }[] => {
  const display_names =
    typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
  return [
    { id: "", label: "No country" },
    ...COUNTRY_CODES.map((code) => ({ id: code, label: display_names?.of(code) ?? code })).sort((first, second) =>
      first.label.localeCompare(second.label)
    ),
  ];
};

/** Character limits mirrored from `UpdateOrganizationRequest`, shown as counters. */
export const FIELD_MAX_LENGTHS: Partial<Record<OrganizationTextField, number>> = {
  company_tagline: 120,
  company_description: 1000,
  login_headline: 120,
  login_message: 280,
  announcement_message: 280,
  announcement_link_label: 40,
};

export const toFormValues = (organization: OrganizationDto): OrganizationFormValues => {
  const text_values = Object.fromEntries(
    ORGANIZATION_TEXT_FIELDS.map((field) => [field, organization[field] ?? ""])
  ) as Record<OrganizationTextField, string>;

  return {
    ...text_values,
    show_name_in_top_bar: organization.show_name_in_top_bar,
    announcement_enabled: organization.announcement_enabled,
    announcement_dismissible: organization.announcement_dismissible,
    company_founded_year: organization.company_founded_year?.toString() ?? "",
    announcement_tone: organization.announcement_tone,
    social_links: Object.fromEntries(
      SOCIAL_NETWORKS.map(({ id }) => [id, organization.social_links[id] ?? ""])
    ) as Record<SocialNetwork, string>,
  };
};

const toNullableText = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/** Only the fields that differ from the saved values, so a save never overwrites what it did not touch. */
export const buildUpdatePayload = (
  saved: OrganizationFormValues,
  draft: OrganizationFormValues
): UpdateOrganizationPayload => {
  const payload: Record<string, unknown> = {};

  for (const field of ORGANIZATION_TEXT_FIELDS) {
    if (draft[field].trim() !== saved[field].trim()) payload[field] = toNullableText(draft[field]);
  }
  for (const field of ORGANIZATION_BOOLEAN_FIELDS) {
    if (draft[field] !== saved[field]) payload[field] = draft[field];
  }
  if (draft.announcement_tone !== saved.announcement_tone) payload.announcement_tone = draft.announcement_tone;
  if (draft.company_founded_year.trim() !== saved.company_founded_year.trim()) {
    const year = parseInt(draft.company_founded_year, 10);
    payload.company_founded_year = Number.isFinite(year) ? year : null;
  }
  const has_social_change = SOCIAL_NETWORKS.some(({ id }) => draft.social_links[id].trim() !== saved.social_links[id].trim());
  if (has_social_change) {
    payload.social_links = Object.fromEntries(
      SOCIAL_NETWORKS.map(({ id }) => [id, toNullableText(draft.social_links[id])])
    );
  }

  return payload as UpdateOrganizationPayload;
};

/** Quick checks before the request, the API still validates everything. */
export const validateDraft = (draft: OrganizationFormValues): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!draft.company_name.trim()) errors.company_name = "The company name is required.";
  if (draft.brand_color && !/^#[0-9a-f]{6}$/i.test(draft.brand_color.trim())) {
    errors.brand_color = "Use a hex color like #e53e2e.";
  }
  if (draft.announcement_enabled && !draft.announcement_message.trim()) {
    errors.announcement_message = "Write a message before turning the announcement on.";
  }
  if (draft.announcement_link_url.trim() && !draft.announcement_link_label.trim()) {
    errors.announcement_link_label = "Give the announcement link a label.";
  }
  return errors;
};
