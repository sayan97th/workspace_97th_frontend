/** API types for Administration > Customization > Profile fields, mirroring `UserProfileFieldResource`. */

export type ProfileFieldType = "text" | "number" | "date" | "dropdown";

export type ProfileFieldOptionDto = {
  id: string;
  label: string;
  color?: string | null;
};

export type ProfileFieldDto = {
  id: number;
  name: string;
  type: ProfileFieldType;
  /** Dropdown choices, always empty for the other types. */
  options: ProfileFieldOptionDto[];
  position: number;
  /** How many users have a value, only on the list endpoint. */
  values_count?: number;
};

export type StoreProfileFieldPayload = {
  name: string;
  type: ProfileFieldType;
  options?: ProfileFieldOptionDto[];
};

/** A field's type cannot change once created, only its name and dropdown options. */
export type UpdateProfileFieldPayload = {
  name?: string;
  options?: ProfileFieldOptionDto[];
};
