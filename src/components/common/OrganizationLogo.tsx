"use client";
import React, { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import BrandLogo from "./BrandLogo";

type OrganizationLogoProps = {
  logo_url: string | null;
  /** Shown while the app is in dark mode, falls back to `logo_url`. */
  logo_dark_url?: string | null;
  company_name: string;
  /** Height in pixels, the width follows the image up to `max_width`. */
  size?: number;
  max_width?: number;
  className?: string;
};

/**
 * The organization's own logo in the top left corner of the app (Administration > Organization),
 * or the default 97th Floor mark when none was uploaded or the image fails to load.
 */
const OrganizationLogo: React.FC<OrganizationLogoProps> = ({
  logo_url,
  logo_dark_url = null,
  company_name,
  size = 32,
  max_width = 64,
  className = "",
}) => {
  const { resolved_theme } = useTheme();
  const image_url = resolved_theme === "dark" ? logo_dark_url ?? logo_url : logo_url;
  const [failed_url, setFailedUrl] = useState<string | null>(null);

  // A new upload gets a new URL, so a previous failure never hides it.
  useEffect(() => setFailedUrl(null), [image_url]);

  if (!image_url || failed_url === image_url) {
    return <BrandLogo size={size} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image_url}
      alt={`${company_name} logo`}
      onError={() => setFailedUrl(image_url)}
      className={`block flex-none select-none object-contain ${className}`}
      style={{ height: size, width: "auto", maxWidth: max_width }}
      draggable={false}
    />
  );
};

export default OrganizationLogo;
