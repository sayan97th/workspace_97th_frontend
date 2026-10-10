import type { OrganizationSettingsApi } from "../useOrganizationSettings";
import type { OrganizationFormValues } from "../organization-form";

/** What every form card of the Organization page receives. */
export type OrganizationSectionProps = {
  draft: OrganizationFormValues;
  field_errors: Record<string, string>;
  setField: OrganizationSettingsApi["setField"];
  /** True for staff, who can read the settings but not change them. */
  is_read_only: boolean;
};
