"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

const LOGO_STORAGE_KEY = "workspace97:branding:logo_url";
const EMAIL_HEADER_STORAGE_KEY = "workspace97:branding:email_header_url";

export type BrandingContextValue = {
  /** Data URL for the uploaded main-menu logo, or null to fall back to the default "97" mark. */
  logo_url: string | null;
  setLogo: (file: File) => void;
  removeLogo: () => void;

  /** Data URL for the uploaded notification-email header image. */
  email_header_url: string | null;
  setEmailHeader: (file: File) => void;
  removeEmailHeader: () => void;
};

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Account-wide branding (main menu logo + notification email header), set from
 * Administration > Customization > Branding and consumed by {@link AppTopBar}'s logo
 * badge. Persisted to localStorage so a refresh doesn't drop what an admin just uploaded —
 * there's no backing API for this app's mock account yet.
 */
export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logo_url, setLogoUrl] = useState<string | null>(null);
  const [email_header_url, setEmailHeaderUrl] = useState<string | null>(null);

  useEffect(() => {
    setLogoUrl(window.localStorage.getItem(LOGO_STORAGE_KEY));
    setEmailHeaderUrl(window.localStorage.getItem(EMAIL_HEADER_STORAGE_KEY));
  }, []);

  const setLogo = (file: File) => {
    readFileAsDataUrl(file).then((data_url) => {
      setLogoUrl(data_url);
      window.localStorage.setItem(LOGO_STORAGE_KEY, data_url);
    });
  };
  const removeLogo = () => {
    setLogoUrl(null);
    window.localStorage.removeItem(LOGO_STORAGE_KEY);
  };

  const setEmailHeader = (file: File) => {
    readFileAsDataUrl(file).then((data_url) => {
      setEmailHeaderUrl(data_url);
      window.localStorage.setItem(EMAIL_HEADER_STORAGE_KEY, data_url);
    });
  };
  const removeEmailHeader = () => {
    setEmailHeaderUrl(null);
    window.localStorage.removeItem(EMAIL_HEADER_STORAGE_KEY);
  };

  return (
    <BrandingContext.Provider
      value={{ logo_url, setLogo, removeLogo, email_header_url, setEmailHeader, removeEmailHeader }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = (): BrandingContextValue => {
  const context = useContext(BrandingContext);
  if (!context) throw new Error("useBranding must be used within a BrandingProvider");
  return context;
};
