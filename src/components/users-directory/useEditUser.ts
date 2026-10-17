"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast/ToastProvider";
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
  /** The API answered 403, the page shows the permission message. */
  is_forbidden: boolean;
  user: AdminUserDto | null;
  department_rows: DepartmentDto[];

  form_data: EditUserFormData;
  setField: (field: keyof EditUserFormData, value: string | number | null) => void;
  field_errors: Record<string, string>;
  /** The form differs from the saved account, so Save and Discard are enabled. */
  is_dirty: boolean;
  discardChanges: () => void;

  is_saving: boolean;
  save_error: string | null;
  success_message: string | null;
  submit: () => Promise<void>;

  /** Disables or enables sign in. Rejects with the API error so the confirm dialog can show it. */
  toggleActive: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  restoreAccount: () => Promise<void>;
};

/**
 * Loads one account for the Manage users edit page (skipped while `is_enabled` is false), saves profile changes back to
 * `/api/admin/users/{id}` and runs the account actions (disable, enable, delete, restore).
 */
export function useEditUser(user_id: string, is_enabled = true): EditUserApi {
  const parsed_user_id = Number(user_id);
  const { showToast } = useToast();

  const [user, setUser] = useState<AdminUserDto | null>(null);
  const [department_rows, setDepartmentRows] = useState<DepartmentDto[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [is_forbidden, setIsForbidden] = useState(false);

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
    // Accounts without the Manage users role never call the API, the page shows the permission message.
    if (!is_enabled) {
      setIsLoading(false);
      return;
    }

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
        if (cancelled) return;
        if ((err as ApiError).status_code === 403) {
          setIsForbidden(true);
          return;
        }
        setLoadError(apiErrorMessage(err, "We couldn't load this user."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [parsed_user_id, is_enabled]);

  const setField = useCallback((field: keyof EditUserFormData, value: string | number | null) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => (current[field] ? { ...current, [field]: "" } : current));
    setSuccessMessage(null);
  }, []);

  const is_dirty = useMemo(() => {
    if (!user) return false;
    const saved = toFormData(user);
    return (Object.keys(saved) as (keyof EditUserFormData)[]).some((key) =>
      typeof saved[key] === "string" ? String(form_data[key]).trim() !== saved[key] : form_data[key] !== saved[key]
    );
  }, [user, form_data]);

  const discardChanges = useCallback(() => {
    if (!user) return;
    setFormData(toFormData(user));
    setFieldErrors({});
    setSaveError(null);
  }, [user]);

  const toggleActive = useCallback(async () => {
    if (!user) return;
    const updated = user.is_active
      ? await adminUsersService.deactivateUser(user.id)
      : await adminUsersService.reactivateUser(user.id);
    setUser(updated);
    showToast({
      variant: "success",
      title: updated.is_active ? `${updated.full_name} can sign in again` : `${updated.full_name} can no longer sign in`,
    });
  }, [user, showToast]);

  const deleteAccount = useCallback(async () => {
    if (!user) return;
    await adminUsersService.deleteUser(user.id);
    setUser({ ...user, deleted_at: new Date().toISOString(), is_deactivated: true });
    showToast({
      variant: "success",
      title: `${user.full_name} was deleted`,
      description: "You can restore the account from this page or the Deleted card in Manage users.",
    });
  }, [user, showToast]);

  const restoreAccount = useCallback(async () => {
    if (!user) return;
    const restored = await adminUsersService.restoreUser(user.id);
    setUser(restored);
    setFormData(toFormData(restored));
    showToast({ variant: "success", title: `${restored.full_name} was restored` });
  }, [user, showToast]);

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
      setSuccessMessage("Changes saved.");
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
    is_forbidden,
    user,
    department_rows,
    form_data,
    setField,
    field_errors,
    is_dirty,
    discardChanges,
    is_saving,
    save_error,
    success_message,
    submit,
    toggleActive,
    deleteAccount,
    restoreAccount,
  };
}
