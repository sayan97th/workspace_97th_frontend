/** API types for the Administration Departments section, mirroring `DepartmentResource`. */

export type DepartmentDto = {
  id: number;
  name: string;
  seat_limit: number | null;
  reserved: number | null;
  assigned: number;
  available: number | null;
  created_at: string;
};

export type CreateDepartmentPayload = {
  name: string;
  seat_limit?: number | null;
};

export type UpdateDepartmentPayload = Partial<CreateDepartmentPayload>;
