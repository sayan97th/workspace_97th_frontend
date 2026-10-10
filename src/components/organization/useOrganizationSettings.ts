"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { organizationService } from "@/services/administration/organization.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { useBranding } from "@/context/BrandingContext";
import { useToast } from "@/components/ui/toast/ToastProvider";
import type { OrganizationAssetKey, OrganizationDto, SocialNetwork } from "@/types/organization";
import {
  buildUpdatePayload,
  toFormValues,
  validateDraft,
  type OrganizationFormValues,
} from "./organization-form";

/** Client side limits mirrored from `StoreOrganizationAssetRequest`. */
const ASSET_RULES: Record<OrganizationAssetKey, { types: string[]; max_bytes: number; label: string }> = {
  logo: { types: ["image/png", "image/jpeg", "image/webp"], max_bytes: 2 * 1024 * 1024, label: "PNG, JPG or WebP up to 2 MB" },
  logo_dark: { types: ["image/png", "image/jpeg", "image/webp"], max_bytes: 2 * 1024 * 1024, label: "PNG, JPG or WebP up to 2 MB" },
  favicon: {
    types: ["image/png", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"],
    max_bytes: 512 * 1024,
    label: "PNG, ICO or WebP up to 512 KB",
  },
};

export const assetRuleLabel = (asset: OrganizationAssetKey): string => ASSET_RULES[asset].label;

export const assetAcceptAttribute = (asset: OrganizationAssetKey): string => ASSET_RULES[asset].types.join(",");

type ApiValidationError = { errors?: Record<string, string[]>; status_code?: number };

export type OrganizationSettingsApi = {
  is_loading: boolean;
  load_error: string | null;
  organization: OrganizationDto | null;
  draft: OrganizationFormValues | null;
  can_edit: boolean;
  is_dirty: boolean;
  is_saving: boolean;
  field_errors: Record<string, string>;
  busy_asset: OrganizationAssetKey | null;
  setField: <K extends keyof OrganizationFormValues>(field: K, value: OrganizationFormValues[K]) => void;
  setSocialLink: (network: SocialNetwork, value: string) => void;
  saveChanges: () => Promise<void>;
  discardChanges: () => void;
  uploadAsset: (asset: OrganizationAssetKey, file: File) => Promise<void>;
  removeAsset: (asset: OrganizationAssetKey) => Promise<void>;
  reload: () => void;
};

/**
 * Owns the Organization page: loads `/api/admin/organization`, keeps an editable draft next to
 * the saved values, saves only the changed fields and maps the API's 422 errors back onto the
 * inputs. Images upload right away through their own endpoint. Every successful write refreshes
 * the shared branding, so the corner logo, brand color and favicon repaint at once.
 */
export function useOrganizationSettings(): OrganizationSettingsApi {
  const toast = useToast();
  const { refreshBranding } = useBranding();
  const [is_loading, setIsLoading] = useState(true);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [organization, setOrganization] = useState<OrganizationDto | null>(null);
  const [saved_values, setSavedValues] = useState<OrganizationFormValues | null>(null);
  const [draft, setDraft] = useState<OrganizationFormValues | null>(null);
  const [is_saving, setIsSaving] = useState(false);
  const [field_errors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy_asset, setBusyAsset] = useState<OrganizationAssetKey | null>(null);
  const [reload_key, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    organizationService
      .getOrganization()
      .then((dto) => {
        if (cancelled) return;
        const form_values = toFormValues(dto);
        setOrganization(dto);
        setSavedValues(form_values);
        setDraft(form_values);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(apiErrorMessage(error, "Failed to load the organization settings."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload_key]);

  const payload = useMemo(
    () => (saved_values && draft ? buildUpdatePayload(saved_values, draft) : {}),
    [saved_values, draft]
  );
  const is_dirty = Object.keys(payload).length > 0;

  const clearFieldError = (field: string) =>
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const { [field]: _removed, ...rest } = current;
      return rest;
    });

  const setField = useCallback(
    <K extends keyof OrganizationFormValues>(field: K, value: OrganizationFormValues[K]) => {
      setDraft((current) => (current ? { ...current, [field]: value } : current));
      clearFieldError(field as string);
    },
    []
  );

  const setSocialLink = useCallback((network: SocialNetwork, value: string) => {
    setDraft((current) => (current ? { ...current, social_links: { ...current.social_links, [network]: value } } : current));
    clearFieldError(`social_links.${network}`);
  }, []);

  const applySavedOrganization = (dto: OrganizationDto) => {
    const form_values = toFormValues(dto);
    setOrganization(dto);
    setSavedValues(form_values);
    setDraft(form_values);
  };

  const saveChanges = async () => {
    if (!draft || !is_dirty || is_saving) return;

    const client_errors = validateDraft(draft);
    if (Object.keys(client_errors).length > 0) {
      setFieldErrors(client_errors);
      toast.error("Check the highlighted fields before saving.");
      return;
    }

    setIsSaving(true);
    try {
      applySavedOrganization(await organizationService.updateOrganization(payload));
      setFieldErrors({});
      toast.success("Organization settings saved", { description: "Everyone sees the changes on their next page load." });
      void refreshBranding();
    } catch (error) {
      const validation_errors = (error as ApiValidationError)?.errors;
      if (validation_errors) {
        setFieldErrors(Object.fromEntries(Object.entries(validation_errors).map(([field, messages]) => [field, messages[0]])));
        toast.error("Check the highlighted fields before saving.");
      } else {
        toast.error(apiErrorMessage(error, "Failed to save the organization settings."));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const discardChanges = () => {
    setDraft(saved_values);
    setFieldErrors({});
  };

  /** Swaps only the asset URLs in, so an upload never throws away unsaved form edits. */
  const applyAssetUrls = (dto: OrganizationDto) =>
    setOrganization((current) =>
      current ? { ...current, logo_url: dto.logo_url, logo_dark_url: dto.logo_dark_url, favicon_url: dto.favicon_url } : dto
    );

  const uploadAsset = async (asset: OrganizationAssetKey, file: File) => {
    const rule = ASSET_RULES[asset];
    if (!rule.types.includes(file.type)) {
      toast.error("This file type is not supported", { description: `Use ${rule.label}.` });
      return;
    }
    if (file.size > rule.max_bytes) {
      toast.error("This file is too large", { description: `Use ${rule.label}.` });
      return;
    }

    setBusyAsset(asset);
    try {
      applyAssetUrls(await organizationService.uploadAsset(asset, file));
      toast.success(asset === "favicon" ? "Favicon updated" : "Logo updated");
      void refreshBranding();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to upload the image."));
    } finally {
      setBusyAsset(null);
    }
  };

  const removeAsset = async (asset: OrganizationAssetKey) => {
    setBusyAsset(asset);
    try {
      applyAssetUrls(await organizationService.removeAsset(asset));
      toast.success(asset === "favicon" ? "Favicon removed" : "Logo removed");
      void refreshBranding();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to remove the image."));
    } finally {
      setBusyAsset(null);
    }
  };

  return {
    is_loading,
    load_error,
    organization,
    draft,
    can_edit: organization?.can_edit ?? false,
    is_dirty,
    is_saving,
    field_errors,
    busy_asset,
    setField,
    setSocialLink,
    saveChanges,
    discardChanges,
    uploadAsset,
    removeAsset,
    reload: () => setReloadKey((key) => key + 1),
  };
}
