/**
 * Thin wrapper over the browser's Web Notifications API, used to surface a
 * new in-app notification on the desktop while the tab is in the background.
 * Whether the user wants this at all is `desktop_notifications_enabled` on
 * their profile, the permission prompt is the browser's own.
 */

export type DesktopNotificationPermission = NotificationPermission | "unsupported";

export const isDesktopNotificationSupported = (): boolean =>
  typeof window !== "undefined" && "Notification" in window;

export const getDesktopNotificationPermission = (): DesktopNotificationPermission =>
  isDesktopNotificationSupported() ? Notification.permission : "unsupported";

/** Asks the browser for permission (a no-op if already decided) and resolves with the outcome. */
export async function requestDesktopNotificationPermission(): Promise<DesktopNotificationPermission> {
  if (!isDesktopNotificationSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

type ShowDesktopNotificationOptions = {
  title: string;
  body: string;
  /** Notifications sharing a tag replace each other instead of piling up. */
  tag: string;
  onClick?: () => void;
};

/** Shows a native notification, returning false when the browser has not granted permission. */
export function showDesktopNotification({ title, body, tag, onClick }: ShowDesktopNotificationOptions): boolean {
  if (getDesktopNotificationPermission() !== "granted") return false;

  const notification = new Notification(title, { body, tag });
  notification.onclick = () => {
    window.focus();
    onClick?.();
    notification.close();
  };
  return true;
}
