import React from "react";
import type { ExternalService } from "@/types/external-account";

export type ExternalAppLogoProps = {
  app: ExternalService;
  size?: number;
  className?: string;
};

/** The Gmail envelope "M" in Google's four colours. */
function GmailMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M6 38h7V21.5L4 15v20a3 3 0 0 0 2 3Z" fill="#4285f4" />
      <path d="M35 38h7a3 3 0 0 0 2-3V15l-9 6.5Z" fill="#34a853" />
      <path d="M35 11v10.5L44 15v-3.5c0-3.3-3.8-5.2-6.4-3.2Z" fill="#fbbc04" />
      <path d="M13 21.5V11l11 8.2L35 11v10.5L24 29.7Z" fill="#ea4335" />
      <path d="M4 11.5V15l9 6.5V11l-2.6-2.7C7.8 6.3 4 8.2 4 11.5Z" fill="#c5221f" />
    </svg>
  );
}

/** Outlook's blue envelope with the white "O" tile. */
function OutlookMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="17" y="9" width="27" height="30" rx="3" fill="#0f6cbd" />
      <path d="M17 20 L30.5 28 L44 20 V36 a3 3 0 0 1 -3 3 H20 a3 3 0 0 1 -3 -3 Z" fill="#28a8ea" />
      <rect x="4" y="13" width="22" height="22" rx="3" fill="#0a4f9c" />
      <ellipse cx="15" cy="24" rx="5.6" ry="6.6" fill="none" stroke="#ffffff" strokeWidth="3" />
    </svg>
  );
}

/** Google Calendar's page with the blue "31". */
function GoogleCalendarMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" rx="4" fill="#ffffff" stroke="#dadce0" strokeWidth="1.5" />
      <path d="M6 10 a4 4 0 0 1 4 -4 h28 a4 4 0 0 1 4 4 v5 H6 Z" fill="#1a73e8" />
      <path d="M33 42 L42 33 H33 Z" fill="#ea4335" />
      <text x="24" y="35" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="16" fill="#1a73e8">31</text>
    </svg>
  );
}

/** The mark of a Gmail, Outlook or Google Calendar integration, decorative. */
export default function ExternalAppLogo({ app, size = 20, className = "" }: ExternalAppLogoProps) {
  return (
    <span className={`inline-flex flex-none items-center justify-center ${className}`}>
      {app === "gmail" ? <GmailMark size={size} /> : app === "outlook" ? <OutlookMark size={size} /> : <GoogleCalendarMark size={size} />}
    </span>
  );
}
