/** API types for the Administration Board ownership section, mirroring `AdminBoardResource`. */

export type AdminBoardOwnerDto = {
  id: number;
  full_name: string;
};

export type AdminBoardDto = {
  id: number;
  label: string;
  workspace_id: number;
  owner: AdminBoardOwnerDto | null;
};

export type BulkReassignBoardOwnerPayload = {
  current_owner_id: number;
  new_owner_id: number;
};
