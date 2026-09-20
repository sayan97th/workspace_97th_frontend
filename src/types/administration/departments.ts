/** API types for the Administration Departments section, mirroring `DepartmentResource`. */

export type DepartmentOwnerDto = {
  id: number;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
};

export type DepartmentDto = {
  id: number;
  name: string;
  seat_limit: number | null;
  reserved: number | null;
  assigned: number;
  available: number | null;
  /** How many users exceed the reserved seats, 0 when within the limit or unlimited. */
  over_by: number;
  owners: DepartmentOwnerDto[];
  /** Admins only: rename, reserve seats, assign owners and delete. */
  can_administer: boolean;
  /** Admins and the department's owners: add and remove members. */
  can_manage_members: boolean;
  created_at: string;
};

export type CreateDepartmentPayload = {
  name: string;
  seat_limit?: number | null;
};

export type UpdateDepartmentPayload = Partial<CreateDepartmentPayload>;

export type DepartmentMutationResponse = {
  message: string;
  department: DepartmentDto;
};
