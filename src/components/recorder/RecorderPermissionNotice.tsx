"use client";
import React, { useEffect, useState } from "react";
import { Camera, ChevronDown, Mic, MonitorX, RefreshCw } from "lucide-react";
import { browserLabel, detectBrowser, isMacOS, permissionSteps, type DeviceAccess, type PermissionKind, type RecorderBrowser, type ScreenAccess } from "./recorderPlatform";

export type RecorderPermissionNoticeProps = {
  kind: PermissionKind;
  access: DeviceAccess | ScreenAccess;
  onRetry: () => void;
  /** Records without this device; omitted when there is nothing to fall back to. */
  onContinueWithout?: () => void;
  continue_label?: string;
};

const ICONS: Record<PermissionKind, React.ReactNode> = {
  camera: <Camera size={16} />,
  microphone: <Mic size={16} />,
  screen: <MonitorX size={16} />,
};

function noticeTitle(kind: PermissionKind, access: DeviceAccess | ScreenAccess, browser: RecorderBrowser, is_mac: boolean): string {
  const device = kind === "camera" ? "Camera" : kind === "microphone" ? "Microphone" : "Screen recording";
  if (access === "system_denied") return `${device} is off for ${browserLabel(browser)} in ${is_mac ? "macOS" : "your system"}`;
  if (access === "not_found") return `No ${kind} found`;
  if (access === "busy") return `${device} is in use by another app`;
  return `${device} access is blocked`;
}

/**
 * One blocked permission in the recorder setup: what is missing, a Try again
 * button that asks the browser once more, a way to record without it, and
 * the exact steps to unblock it on this browser and system (macOS System
 * Settings included). The steps open by themselves when the browser can no
 * longer ask, the only fix left is the settings.
 */
export default function RecorderPermissionNotice({ kind, access, onRetry, onContinueWithout, continue_label }: RecorderPermissionNoticeProps) {
  // Resolved after mount, the server can't know the browser.
  const [platform, setPlatform] = useState<{ browser: RecorderBrowser; is_mac: boolean }>({ browser: "other", is_mac: false });
  useEffect(() => setPlatform({ browser: detectBrowser(), is_mac: isMacOS() }), []);
  const [is_help_open, setHelpOpen] = useState(access === "system_denied");

  const steps = permissionSteps(kind, access, platform.browser, platform.is_mac);

  return (
    <div className="recorder-permission" data-kind={kind} role="alert">
      <div className="recorder-permission__row">
        <span className="recorder-permission__icon" aria-hidden="true">
          {ICONS[kind]}
        </span>
        <div className="recorder-permission__text">
          <strong>{noticeTitle(kind, access, platform.browser, platform.is_mac)}</strong>
          <button type="button" className="recorder-permission__help-toggle" onClick={() => setHelpOpen((open) => !open)} aria-expanded={is_help_open}>
            How to allow it
            <ChevronDown size={13} aria-hidden="true" />
          </button>
        </div>
        <div className="recorder-permission__actions">
          {onContinueWithout && (
            <button type="button" className="recorder-permission__secondary" onClick={onContinueWithout}>
              {continue_label ?? `Skip ${kind}`}
            </button>
          )}
          <button type="button" className="recorder-permission__retry" onClick={onRetry}>
            <RefreshCw size={13} aria-hidden="true" />
            Try again
          </button>
        </div>
      </div>
      {is_help_open && (
        <ol className="recorder-permission__steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
