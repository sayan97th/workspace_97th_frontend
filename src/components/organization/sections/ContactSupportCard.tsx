"use client";
import React, { useMemo } from "react";
import { LifeBuoy } from "lucide-react";
import SettingsDropdown from "@/components/administration/SettingsDropdown";
import { Field, OrganizationCard, input_class } from "../organization-fields";
import { countryOptions, type OrganizationTextField } from "../organization-form";
import type { OrganizationSectionProps } from "./section-props";

type TextInputSpec = {
  field: OrganizationTextField;
  label: string;
  type?: "text" | "email" | "url" | "tel";
  placeholder: string;
  hint?: string;
  auto_complete?: string;
  wide?: boolean;
};

const SUPPORT_FIELDS: TextInputSpec[] = [
  {
    field: "support_email",
    label: "Support email",
    type: "email",
    placeholder: "support@97thfloor.com",
    hint: "The Contact support link of the Help menu.",
    auto_complete: "email",
  },
  {
    field: "support_url",
    label: "Help center",
    type: "url",
    placeholder: "https://help.97thfloor.com",
    hint: "The Help center link of the Help menu.",
    auto_complete: "url",
  },
  { field: "contact_phone", label: "Phone", type: "tel", placeholder: "+1 801 555 0100", auto_complete: "tel" },
];

const ADDRESS_FIELDS: TextInputSpec[] = [
  { field: "address_line_1", label: "Street address", placeholder: "123 Main Street", auto_complete: "address-line1", wide: true },
  { field: "address_line_2", label: "Suite, floor or unit", placeholder: "Floor 97", auto_complete: "address-line2", wide: true },
  { field: "address_city", label: "City", placeholder: "Salt Lake City", auto_complete: "address-level2" },
  { field: "address_state", label: "State or region", placeholder: "Utah", auto_complete: "address-level1" },
  { field: "address_postal_code", label: "Postal code", placeholder: "84101", auto_complete: "postal-code" },
];

/** Support email, help center, phone and the company's mailing address. */
const ContactSupportCard: React.FC<OrganizationSectionProps> = ({ draft, field_errors, setField, is_read_only }) => {
  const country_options = useMemo(countryOptions, []);

  const renderInput = (spec: TextInputSpec) => (
    <Field
      key={spec.field}
      label={spec.label}
      is_optional
      hint={spec.hint}
      error={field_errors[spec.field]}
      className={spec.wide ? "sm:col-span-2" : ""}
    >
      {(input_props) => (
        <input
          {...input_props}
          type={spec.type ?? "text"}
          value={draft[spec.field]}
          onChange={(event) => setField(spec.field, event.target.value)}
          autoComplete={spec.auto_complete}
          className={input_class}
          placeholder={spec.placeholder}
        />
      )}
    </Field>
  );

  return (
    <OrganizationCard
      id="contact"
      icon={LifeBuoy}
      title="Contact and support"
      description="Where people go when they need help. The support email and help center power the Help (?) menu in the top bar."
    >
      <div className="grid gap-5 sm:grid-cols-2">{SUPPORT_FIELDS.map(renderInput)}</div>

      <div className="mb-3 mt-6 border-t border-shell-border pt-5 text-[13.5px] font-semibold text-shell-text">
        Company address
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {ADDRESS_FIELDS.map(renderInput)}
        <Field label="Country" is_optional error={field_errors.address_country}>
          {() => (
            <fieldset disabled={is_read_only} className="contents">
              <SettingsDropdown
                value={draft.address_country}
                options={country_options}
                onChange={(country) => setField("address_country", country)}
                placeholder="Select a country"
                is_searchable
                className="h-10 w-full !rounded-md !bg-shell-panel !text-[14px]"
              />
            </fieldset>
          )}
        </Field>
      </div>
    </OrganizationCard>
  );
};

export default ContactSupportCard;
