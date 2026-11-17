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

export const COUNTDOWN_SECONDS = 3;

/** The default every time the recorder opens: the screen with the microphone, what the team records most. */
export const DEFAULT_RECORDING_MODE: RecordingMode = "screen";

export type RecordingQuality = "720p" | "1080p" | "1440p";

export type RecordingQualityPreset = {
  id: RecordingQuality;
  label: string;
  caption: string;
  width: number;
  height: number;
  /** Target video bitrate for screen captures, text heavy, so it gets the most. */
  screen_bits_per_second: number;
  /** Target video bitrate for the camera only mode. */
  camera_bits_per_second: number;
};

export const RECORDING_QUALITY_PRESETS: RecordingQualityPreset[] = [
  { id: "720p", label: "Standard", caption: "Smaller files, quick to upload", width: 1280, height: 720, screen_bits_per_second: 2_500_000, camera_bits_per_second: 1_500_000 },
  { id: "1080p", label: "Full HD", caption: "Sharp text, recommended", width: 1920, height: 1080, screen_bits_per_second: 5_000_000, camera_bits_per_second: 2_500_000 },
  { id: "1440p", label: "Quad HD", caption: "Every detail, larger files", width: 2560, height: 1440, screen_bits_per_second: 8_000_000, camera_bits_per_second: 4_000_000 },
];

export const DEFAULT_RECORDING_QUALITY: RecordingQuality = "1080p";

export function qualityPreset(quality: RecordingQuality): RecordingQualityPreset {
  return RECORDING_QUALITY_PRESETS.find((preset) => preset.id === quality) ?? RECORDING_QUALITY_PRESETS[1];
}

const AUDIO_BITS_PER_SECOND = 128_000;
export const RECORDING_AUDIO_BITS_PER_SECOND = AUDIO_BITS_PER_SECOND;

/** Mirrors the API's video limit (`App\Rules\CommentAttachmentFile::MAX_VIDEO_KILOBYTES`). */
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
/** Container overhead and bitrate peaks eat into the limit, aim below it. */
const VIDEO_SIZE_HEADROOM = 0.9;
/** Even at the lightest quality a single video stays a walkthrough, not a meeting recording. */
const ABSOLUTE_MAX_RECORDING_MS = 30 * 60 * 1000;

/**
 * How long a video can run at this quality and still fit the upload limit:
 * about 24 minutes at 720p, 12 at 1080p and 7 at 1440p. Higher quality
 * spends more bits per second, so the clock is shorter.
 */
export function maxRecordingMs(quality: RecordingQuality, mode: RecordingMode): number {
  const preset = qualityPreset(quality);
  const video_bits = mode === "camera" ? preset.camera_bits_per_second : preset.screen_bits_per_second;
  const seconds = (MAX_VIDEO_BYTES * VIDEO_SIZE_HEADROOM * 8) / (video_bits + AUDIO_BITS_PER_SECOND);
  return Math.min(ABSOLUTE_MAX_RECORDING_MS, Math.floor(seconds / 60) * 60 * 1000);
}

/** Screen capture constraints for a quality: the resolution is a ceiling, a smaller screen records at its own size. */
export function displayMediaOptions(quality: RecordingQuality): DisplayMediaStreamOptions & Record<string, unknown> {
  const preset = qualityPreset(quality);
  return {
    video: { frameRate: { ideal: 30, max: 30 }, width: { ideal: preset.width, max: preset.width }, height: { ideal: preset.height, max: preset.height } },
    // Tab or system audio when the picker offers it, mixed with the microphone.
    audio: true,
    // Chromium hints: let the user pick this tab too, and switch tabs while recording.
    selfBrowserSurface: "include",
    surfaceSwitching: "include",
    systemAudio: "include",
    monitorTypeSurfaces: "include",
  };
}

/** Camera constraints for a quality, cameras top out at 1080p. */
export function cameraConstraints(quality: RecordingQuality): MediaTrackConstraints {
  const preset = qualityPreset(quality);
  return { width: { ideal: Math.min(preset.width, 1920) }, height: { ideal: Math.min(preset.height, 1080) }, frameRate: { ideal: 30 } };
}

const QUALITY_STORAGE_KEY = "screen-recorder.quality";

/** The quality picked last time in this browser. */
export function readStoredQuality(): RecordingQuality {
  try {
    const stored = window.localStorage.getItem(QUALITY_STORAGE_KEY);
    return RECORDING_QUALITY_PRESETS.some((preset) => preset.id === stored) ? (stored as RecordingQuality) : DEFAULT_RECORDING_QUALITY;
  } catch {
    return DEFAULT_RECORDING_QUALITY;
  }
}

export function storeQuality(quality: RecordingQuality) {
  try {
    window.localStorage.setItem(QUALITY_STORAGE_KEY, quality);
  } catch {
    // Private mode or blocked storage, the choice just isn't remembered.
  }
}

/** A camera or microphone the pickers list. */
export type RecorderDevice = { id: string; label: string };

/**
 * Turns `enumerateDevices()` into a clean list: Chrome adds "default" and
 * "communications" aliases of real devices (they would show twice), and
 * labels often end in a USB id like "(046d:0892)".
 */
export function toRecorderDevices(devices: MediaDeviceInfo[], kind: MediaDeviceKind, fallback_label: string): RecorderDevice[] {
  return devices
    .filter((device) => device.kind === kind && device.deviceId && device.deviceId !== "default" && device.deviceId !== "communications")
    .map((device, index) => ({
      id: device.deviceId,
      label: device.label.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, "").trim() || `${fallback_label} ${index + 1}`,
    }));
}

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

/** "12 minutes", "1 minute". */
export function formatMinutes(milliseconds: number): string {
  const minutes = Math.max(1, Math.round(milliseconds / 60000));
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
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
