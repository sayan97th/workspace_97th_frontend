/** What the recorder captures: the screen with a camera bubble on top (Loom's default), only the screen, or only the camera. */
export type RecordingMode = "screen_camera" | "screen" | "camera";

export type RecorderPhase =
  /** Nothing on screen. */
  | "idle"
  /** The setup dialog: mode, camera and microphone pickers, live previews. */
  | "setup"
  /** Waiting on the browser's screen picker. */
  | "starting"
  /** 3, 2, 1 before the capture starts. */
  | "countdown"
  | "recording"
  | "paused"
  /** Stopped, the file is being assembled. */
  | "processing"
  /** The review dialog: watch, rename, attach or record again. */
  | "review";

export type RecordingResult = {
  file: File;
  /** Local `blob:` URL of `file`, for the review player. */
  url: string;
  duration_ms: number;
};

/**
 * Loom's free plan caps at 5 minutes, ours allows a longer walkthrough. At the
 * bitrates below 20 minutes stays around 400 MB, under the API's 500 MB video
 * limit (`App\Rules\CommentAttachmentFile::MAX_VIDEO_KILOBYTES`).
 */
export const MAX_RECORDING_MS = 20 * 60 * 1000;

/** Video bitrates in bits per second: crisp 1080p text for screens, less for a talking head. */
export const SCREEN_VIDEO_BITS_PER_SECOND = 2_500_000;
export const CAMERA_VIDEO_BITS_PER_SECOND = 2_000_000;

export const COUNTDOWN_SECONDS = 3;

/** Screen capture: 1080p at 30 fps is plenty for UI walkthroughs and keeps files small. */
export const DISPLAY_MEDIA_OPTIONS: DisplayMediaStreamOptions & Record<string, unknown> = {
  video: { frameRate: { ideal: 30, max: 30 }, width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 } },
  // Tab or system audio when the picker offers it, mixed with the microphone.
  audio: true,
  // Chromium hints: let the user pick this tab too, and switch tabs while recording.
  selfBrowserSurface: "include",
  surfaceSwitching: "include",
  systemAudio: "include",
  monitorTypeSurfaces: "include",
};

export const CAMERA_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
};

export const MICROPHONE_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/** Preferred containers, best first: WebM VP9 (Chrome, Edge, Firefox), then MP4 (Safari, newer Chrome). */
const MIME_TYPE_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1,mp4a",
  "video/mp4",
];

/** The first container this browser's `MediaRecorder` can write, or "" to let it choose. */
export function pickRecordingMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_TYPE_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

/** `MediaRecorder` plus camera and microphone access, every modern desktop and mobile browser. */
export function isRecordingSupported(): boolean {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

/** Screen capture, desktop browsers only (phones and tablets have no `getDisplayMedia`). */
export function isScreenCaptureSupported(): boolean {
  return typeof window !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia);
}

/** Minimal typing of the Document Picture in Picture API (Chrome and Edge 116+), not in TypeScript's DOM lib yet. */
type DocumentPictureInPicture = {
  requestWindow: (options?: { width?: number; height?: number; disallowReturnToOpener?: boolean }) => Promise<Window>;
  window: Window | null;
};

export function getDocumentPictureInPicture(): DocumentPictureInPicture | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { documentPictureInPicture?: DocumentPictureInPicture }).documentPictureInPicture ?? null;
}

/**
 * Gives the floating Picture in Picture window the page's styles (the
 * recorder's SCSS, Tailwind and the theme variables), it starts as a blank
 * document. Cross origin sheets that can't be read are linked instead.
 */
export function copyStylesInto(target: Window) {
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      const style = target.document.createElement("style");
      style.textContent = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join("\n");
      target.document.head.appendChild(style);
    } catch {
      if (!sheet.href) return;
      const link = target.document.createElement("link");
      link.rel = "stylesheet";
      link.href = sheet.href;
      target.document.head.appendChild(link);
    }
  });
  target.document.documentElement.className = document.documentElement.className;
  target.document.documentElement.setAttribute("style", document.documentElement.getAttribute("style") ?? "");
  target.document.body.className = "screen-recorder-pip-body";
}

/** "0:42", "12:05" or "1:02:09". */
export function formatRecordingTime(milliseconds: number): string {
  const total_seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(total_seconds / 3600);
  const minutes = Math.floor((total_seconds % 3600) / 60);
  const seconds = String(total_seconds % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** File extension for a recorder MIME type, "webm" when unknown. */
export function recordingExtension(mime_type: string): string {
  if (mime_type.startsWith("video/mp4")) return "mp4";
  return "webm";
}

/** "Recording 2026-11-17 at 10.42" (dots, a colon is not allowed in Windows file names). */
export function defaultRecordingTitle(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `Recording ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} at ${pad(date.getHours())}.${pad(date.getMinutes())}`;
}

/** Turns a title typed in the review dialog into a safe file name with the right extension. */
export function recordingFileName(title: string, mime_type: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${cleaned || defaultRecordingTitle()}.${recordingExtension(mime_type)}`;
}

/** A friendly sentence for a `getUserMedia`/`getDisplayMedia`/`MediaRecorder` failure. */
export function describeMediaError(error: unknown): string {
  const name = error instanceof DOMException || error instanceof Error ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Access was blocked. Allow camera, microphone and screen sharing for this site in your browser settings, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera or microphone was found. Connect one or pick another device.";
    case "NotReadableError":
    case "AbortError":
      return "Your camera or microphone is being used by another app. Close it and try again.";
    case "InvalidStateError":
      return "Your browser needs one more click to share the screen. Press Start recording again.";
    default:
      return "Recording could not start. Please try again.";
  }
}

/** True for the error a browser throws when the user simply closed the screen picker. */
export function isPickerDismissed(error: unknown): boolean {
  const name = error instanceof DOMException || error instanceof Error ? error.name : "";
  return name === "NotAllowedError" || name === "AbortError";
}

/** Stops every track of the given streams, turning the camera light and the "sharing" bar off. */
export function stopStreams(...streams: Array<MediaStream | null | undefined>) {
  streams.forEach((stream) => stream?.getTracks().forEach((track) => track.stop()));
}
