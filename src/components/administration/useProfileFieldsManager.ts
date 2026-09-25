"use client";
import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { profileFieldsService } from "@/services/administration/profile-fields.service";
import type {
  ProfileFieldDto,
  StoreProfileFieldPayload,
  UpdateProfileFieldPayload,
} from "@/types/administration/profile-fields";

export type ProfileFieldsManagerApi = {
  is_loading: boolean;
  error: string | null;
  fields: ProfileFieldDto[];
  /** Saves a new field (no `field_id`) or edits an existing one; resolves true on success. */
  saveField: (field_id: number | null, payload: StoreProfileFieldPayload | UpdateProfileFieldPayload) => Promise<boolean>;
  field_pending_delete: ProfileFieldDto | null;
  requestDelete: (field: ProfileFieldDto) => void;
  closeDelete: () => void;
  confirmDelete: () => Promise<void>;
  /** Optimistically reorders, then persists the new order. */
  reorder: (field_ids: number[]) => Promise<void>;
};

/** Owns Administration > Customization > Profile fields against `/api/admin/profile-fields`. */
export function useProfileFieldsManager(): ProfileFieldsManagerApi {
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<ProfileFieldDto[]>([]);
  const [field_pending_delete, setFieldPendingDelete] = useState<ProfileFieldDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    profileFieldsService
      .getFields()
      .then((result) => {
        if (!cancelled) setFields(result);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "We couldn't load profile fields."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveField = useCallback(
    async (field_id: number | null, payload: StoreProfileFieldPayload | UpdateProfileFieldPayload) => {
      setError(null);
      try {
        if (field_id === null) {
          const created = await profileFieldsService.createField(payload as StoreProfileFieldPayload);
          setFields((current) => [...current, { ...created, values_count: 0 }]);
        } else {
          const updated = await profileFieldsService.updateField(field_id, payload);
          setFields((current) =>
            current.map((field) => (field.id === field_id ? { ...updated, values_count: field.values_count } : field))
          );
        }
        return true;
      } catch (err) {
        setError(apiErrorMessage(err, "We couldn't save that profile field."));
        return false;
      }
    },
    []
  );

  const requestDelete = useCallback((field: ProfileFieldDto) => setFieldPendingDelete(field), []);
  const closeDelete = useCallback(() => setFieldPendingDelete(null), []);

  const confirmDelete = useCallback(async () => {
    if (!field_pending_delete) return;
    await profileFieldsService.deleteField(field_pending_delete.id);
    setFields((current) => current.filter((field) => field.id !== field_pending_delete.id));
    setFieldPendingDelete(null);
  }, [field_pending_delete]);

  const reorder = useCallback(async (field_ids: number[]) => {
    let previous: ProfileFieldDto[] = [];
    setFields((current) => {
      previous = current;
      return field_ids
        .map((id) => current.find((field) => field.id === id))
        .filter((field): field is ProfileFieldDto => field !== undefined);
    });
    try {
      await profileFieldsService.reorderFields(field_ids);
    } catch (err) {
      setFields(previous);
      setError(apiErrorMessage(err, "We couldn't save the new order."));
    }
  }, []);

  return {
    is_loading,
    error,
    fields,
    saveField,
    field_pending_delete,
    requestDelete,
    closeDelete,
    confirmDelete,
    reorder,
  };
}
