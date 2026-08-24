"use client";
import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { accountSettingsService } from "@/services/administration/account-settings.service";

export type BrandingManagerApi = {
  is_loading: boolean;
  error: string | null;

  logo_url: string | null;
  is_uploading_logo: boolean;
  uploadLogo: (file: File) => Promise<void>;
  removeLogo: () => Promise<void>;

  email_header_url: string | null;
  is_uploading_email_header: boolean;
  uploadEmailHeader: (file: File) => Promise<void>;
  removeEmailHeader: () => Promise<void>;
};

/**
 * Owns the Branding section's real uploads against `/api/admin/account-settings/{logo,
 * email-header}`, replacing the old `BrandingContext`'s localStorage-only persistence.
 * `AppTopBar`'s own logo badge reads the lighter-weight `useAccountBranding()` instead,
 * since it needs to work for any authenticated user, not just staff.
 */
export function useBrandingManager(): BrandingManagerApi {
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logo_url, setLogoUrl] = useState<string | null>(null);
  const [email_header_url, setEmailHeaderUrl] = useState<string | null>(null);
  const [is_uploading_logo, setIsUploadingLogo] = useState(false);
  const [is_uploading_email_header, setIsUploadingEmailHeader] = useState(false);

  useEffect(() => {
    let cancelled = false;
    accountSettingsService
      .getAccountSettings()
      .then((dto) => {
        if (cancelled) return;
        setLogoUrl(dto.logo_url);
        setEmailHeaderUrl(dto.email_header_url);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "Failed to load branding settings."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const uploadLogo = async (file: File) => {
    setIsUploadingLogo(true);
    setError(null);
    try {
      const dto = await accountSettingsService.uploadLogo(file);
      setLogoUrl(dto.logo_url);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to upload logo."));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const removeLogo = async () => {
    try {
      const dto = await accountSettingsService.removeLogo();
      setLogoUrl(dto.logo_url);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to remove logo."));
    }
  };

  const uploadEmailHeader = async (file: File) => {
    setIsUploadingEmailHeader(true);
    setError(null);
    try {
      const dto = await accountSettingsService.uploadEmailHeader(file);
      setEmailHeaderUrl(dto.email_header_url);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to upload email header."));
    } finally {
      setIsUploadingEmailHeader(false);
    }
  };

  const removeEmailHeader = async () => {
    try {
      const dto = await accountSettingsService.removeEmailHeader();
      setEmailHeaderUrl(dto.email_header_url);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to remove email header."));
    }
  };

  return {
    is_loading,
    error,
    logo_url,
    is_uploading_logo,
    uploadLogo,
    removeLogo,
    email_header_url,
    is_uploading_email_header,
    uploadEmailHeader,
    removeEmailHeader,
  };
}
