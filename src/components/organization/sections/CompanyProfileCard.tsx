"use client";
import React, { useMemo } from "react";
import { Building2 } from "lucide-react";
import SettingsDropdown from "@/components/administration/SettingsDropdown";
import { Field, OrganizationCard, input_class, textarea_class } from "../organization-fields";
import { COMPANY_SIZE_OPTIONS, FIELD_MAX_LENGTHS, INDUSTRY_OPTIONS } from "../organization-form";
import type { OrganizationSectionProps } from "./section-props";

const dropdown_class = "h-10 w-full !rounded-md !bg-shell-panel !text-[14px]";

/** Company name, legal name, tagline, description, industry, size, founding year and website. */
const CompanyProfileCard: React.FC<OrganizationSectionProps> = ({ draft, field_errors, setField, is_read_only }) => {
  const current_year = new Date().getFullYear();
  const industry_options = useMemo(() => [{ id: "", label: "Not set" }, ...INDUSTRY_OPTIONS], []);
  const size_options = useMemo(() => [{ id: "", label: "Not set" }, ...COMPANY_SIZE_OPTIONS], []);

  return (
    <OrganizationCard
      id="profile"
      icon={Building2}
      title="Company profile"
      description="How your company introduces itself across the workspace, on the sign in page and in the account menu."
    >
      <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
        <Field label="Company name" hint="Shown in the account menu, the top bar and the sign in page." error={field_errors.company_name}>
          {(input_props) => (
            <input
              {...input_props}
              type="text"
              value={draft.company_name}
              onChange={(event) => setField("company_name", event.target.value)}
              maxLength={255}
              className={input_class}
              placeholder="97th Floor"
            />
          )}
        </Field>

        <Field label="Legal name" is_optional hint="Used on invoices and legal documents." error={field_errors.company_legal_name}>
          {(input_props) => (
            <input
              {...input_props}
              type="text"
              value={draft.company_legal_name}
              onChange={(event) => setField("company_legal_name", event.target.value)}
              maxLength={255}
              className={input_class}
              placeholder="97th Floor LLC"
            />
          )}
        </Field>

        <Field
          label="Tagline"
          is_optional
          className="sm:col-span-2"
          error={field_errors.company_tagline}
          counter={{ length: draft.company_tagline.length, max: FIELD_MAX_LENGTHS.company_tagline ?? 120 }}
        >
          {(input_props) => (
            <input
              {...input_props}
              type="text"
              value={draft.company_tagline}
              onChange={(event) => setField("company_tagline", event.target.value)}
              maxLength={FIELD_MAX_LENGTHS.company_tagline}
              className={input_class}
              placeholder="Content that ranks, converts and scales"
            />
          )}
        </Field>

        <Field
          label="About the company"
          is_optional
          className="sm:col-span-2"
          error={field_errors.company_description}
          counter={{ length: draft.company_description.length, max: FIELD_MAX_LENGTHS.company_description ?? 1000 }}
        >
          {(input_props) => (
            <textarea
              {...input_props}
              rows={3}
              value={draft.company_description}
              onChange={(event) => setField("company_description", event.target.value)}
              maxLength={FIELD_MAX_LENGTHS.company_description}
              className={textarea_class}
              placeholder="A short description of what your company does and who it serves."
            />
          )}
        </Field>

        <Field label="Industry" is_optional error={field_errors.company_industry}>
          {() => (
            <fieldset disabled={is_read_only} className="contents">
              <SettingsDropdown
                value={draft.company_industry}
                options={industry_options}
                onChange={(industry) => setField("company_industry", industry)}
                placeholder="Select an industry"
                className={dropdown_class}
              />
            </fieldset>
          )}
        </Field>

        <Field label="Company size" is_optional error={field_errors.company_size}>
          {() => (
            <fieldset disabled={is_read_only} className="contents">
              <SettingsDropdown
                value={draft.company_size}
                options={size_options}
                onChange={(size) => setField("company_size", size)}
                placeholder="Select a size"
                className={dropdown_class}
              />
            </fieldset>
          )}
        </Field>

        <Field label="Founded in" is_optional error={field_errors.company_founded_year}>
          {(input_props) => (
            <input
              {...input_props}
              type="number"
              inputMode="numeric"
              min={1800}
              max={current_year}
              value={draft.company_founded_year}
              onChange={(event) => setField("company_founded_year", event.target.value)}
              className={input_class}
              placeholder={String(current_year - 10)}
            />
          )}
        </Field>

        <Field label="Website" is_optional hint="Linked from the Help menu." error={field_errors.company_website}>
          {(input_props) => (
            <input
              {...input_props}
              type="url"
              value={draft.company_website}
              onChange={(event) => setField("company_website", event.target.value)}
              className={input_class}
              placeholder="https://www.97thfloor.com"
            />
          )}
        </Field>
      </div>
    </OrganizationCard>
  );
};

export default CompanyProfileCard;
