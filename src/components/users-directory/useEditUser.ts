"use client";
import { useCallback, useEffect, useState } from "react";
import { adminUsersService } from "@/services/administration/admin-users.service";
import { departmentsService } from "@/services/administration/departments.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { AdminUserDto } from "@/types/administration/admin-users";
import type { DepartmentDto } from "@/types/administration/departments";
import type { ApiError } from "@/types/auth";

export type EditUserFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department_id: number | null;
};

const toFormData = (user: AdminUserDto): EditUserFormData => ({
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  phone: user.phone ?? "",
  department_id: user.department?.id ?? null,
});

export type EditUserApi = {
  is_loading: boolean;
  load_error: string | null;
  user: AdminUserDto | null;
  department_rows: DepartmentDto[];

  form_data: EditUserFormData;
  setField: (field: keyof EditUserFormData, value: string | number | null) => void;
  field_errors: Record<string, string>;

  is_saving: boolean;
  save_error: string | null;
  success_message: string | null;
  submit: () => Promise<void>;
};

/** Loads one account for the admin "Edit user" page and saves changes back to `/api/admin/users/{id}`. */
export function useEditUser(user_id: string): EditUserApi {
  const parsed_user_id = Number(user_id);

  const [user, setUser] = useState<AdminUserDto | null>(null);
  const [department_rows, setDepartmentRows] = useState<DepartmentDto[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [load_error, setLoadError] = useState<string | null>(null);

  const [form_data, setFormData] = useState<EditUserFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    department_id: null,
  });
  const [field_errors, setFieldErrors] = useState<Record<string, string>>({});
  const [is_saving, setIsSaving] = useState(false);
  const [save_error, setSaveError] = useState<string | null>(null);
  const [success_message, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(parsed_user_id) || parsed_user_id <= 0) {
      setLoadError("This user could not be found.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    Promise.all([adminUsersService.getUser(parsed_user_id), departmentsService.getDepartments()])
      .then(([fetched_user, departments]) => {
        if (cancelled) return;
        setUser(fetched_user);
        setFormData(toFormData(fetched_user));
        setDepartmentRows(departments);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(apiErrorMessage(err, "We couldn't load this user."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [parsed_user_id]);

  const setField = useCallback((field: keyof EditUserFormData, value: string | number | null) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => (current[field] ? { ...current, [field]: "" } : current));
  }, []);

  const submit = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    setFieldErrors({});
    try {
      const updated = await adminUsersService.updateUser(user.id, {
        first_name: form_data.first_name.trim(),
        last_name: form_data.last_name.trim(),
        email: form_data.email.trim(),
        phone: form_data.phone.trim() || null,
        department_id: form_data.department_id,
      });
      setUser(updated);
      setFormData(toFormData(updated));
      setSuccessMessage("User updated successfully.");
    } catch (err: unknown) {
      const api_error = err as ApiError;
      if (api_error.errors) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(api_error.errors)) {
          mapped[key] = messages[0];
        }
        setFieldErrors(mapped);
        setSaveError("Please fix the highlighted fields and try again.");
      } else {
        setSaveError(apiErrorMessage(err, "We couldn't save these changes."));
      }
    } finally {
      setIsSaving(false);
    }
  }, [user, form_data]);

  return {
    is_loading,
    load_error,
    user,
    department_rows,
    form_data,
    setField,
    field_errors,
    is_saving,
    save_error,
    success_message,
    submit,
  };
}
