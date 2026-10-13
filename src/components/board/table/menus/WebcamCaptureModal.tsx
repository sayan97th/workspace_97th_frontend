"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface WebcamCaptureModalProps {
  /** Uploads the captured photo. Rejecting keeps the dialog open and shows the error, resolving closes it. */
  onUpload: (file: File) => Promise<void>;
  onClose: () => void;
}

type CameraState = "starting" | "live" | "captured" | "unavailable";

/** Pulls the most useful message out of an `apiClient` rejection (`{ message, errors }`). */
function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const { errors, message } = error as { errors?: Record<string, string[]>; message?: string };
    const first_field_error = errors ? Object.values(errors).flat()[0] : undefined;
    if (first_field_error) return first_field_error;
    if (message) return message;
  }
  return "The photo could not be uploaded. Please try again.";
}

function describeCameraError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera access was blocked. Allow it in your browser settings and try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found on this device.";
  if (name === "NotReadableError") return "The camera is being used by another app.";
  return "The camera could not be started.";
}

/** "Webcam photo 2026-10-12 14.05.png", a name that sorts and reads well in the cell. */
function buildPhotoName(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `Webcam photo ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}.png`;
}

/**
 * A Files cell's "From Webcam" dialog: a live camera preview, "Take photo",
 * then "Retake" or "Upload". The photo goes through the same upload endpoint
 * as "From Computer", as a PNG. The camera is released as soon as the photo
 * is taken or the dialog closes.
 */
export default function WebcamCaptureModal({ onUpload, onClose }: WebcamCaptureModalProps) {
  const video_ref = useRef<HTMLVideoElement>(null);
  const stream_ref = useRef<MediaStream | null>(null);
  const [camera_state, setCameraState] = useState<CameraState>("starting");
  const [photo_blob, setPhotoBlob] = useState<Blob | null>(null);
  const [photo_url, setPhotoUrl] = useState<string | null>(null);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [is_uploading, setIsUploading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const title_id = useId();

  const stopCamera = () => {
    stream_ref.current?.getTracks().forEach((track) => track.stop());
    stream_ref.current = null;
  };

  // Starts (or restarts, on "Retake") the camera. `attempt` bumps to run it again.
  useEffect(() => {
    let is_cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unavailable");
      setErrorMessage("This browser cannot use a camera here. Camera access needs a secure (https) connection.");
      return;
    }
    setCameraState("starting");
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((stream) => {
        if (is_cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream_ref.current = stream;
        if (video_ref.current) video_ref.current.srcObject = stream;
        setCameraState("live");
      })
      .catch((error: unknown) => {
        if (is_cancelled) return;
        setCameraState("unavailable");
        setErrorMessage(describeCameraError(error));
      });
    return () => {
      is_cancelled = true;
      stopCamera();
    };
  }, [attempt]);

  useEffect(() => () => {
    if (photo_url) URL.revokeObjectURL(photo_url);
  }, [photo_url]);

  // Subscribed once, see `FileLinkModal`: a listener swapped mid dispatch would miss the Escape press.
  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape" && !is_uploading) onClose();
  });
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleEscape(event);
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const takePhoto = () => {
    const video = video_ref.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setErrorMessage("The photo could not be taken. Please try again.");
        return;
      }
      stopCamera();
      setPhotoBlob(blob);
      setPhotoUrl(URL.createObjectURL(blob));
      setCameraState("captured");
    }, "image/png");
  };

  const retake = () => {
    setPhotoBlob(null);
    setPhotoUrl(null);
    setErrorMessage(null);
    setAttempt((current) => current + 1);
  };

  const upload = async () => {
    if (!photo_blob) return;
    setIsUploading(true);
    setErrorMessage(null);
    try {
      await onUpload(new File([photo_blob], buildPhotoName(), { type: "image/png" }));
      onClose();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
      setIsUploading(false);
    }
  };

  if (typeof document === "undefined") return null;

  const secondary_button_class =
    "rounded-[6px] border border-boardtree-border px-4 py-2 text-[14px] text-boardtree-text hover:bg-boardtree-hover disabled:cursor-not-allowed disabled:opacity-50";
  const primary_button_class =
    "rounded-[6px] bg-boardtree-accent px-5 py-2 text-[14px] font-medium text-white hover:bg-boardtree-accent-hover disabled:cursor-not-allowed disabled:bg-boardtree-hover disabled:text-boardtree-text-faint";

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[rgba(30,34,55,0.45)] p-4"
      onClick={() => !is_uploading && onClose()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title_id}
        onClick={(e) => e.stopPropagation()}
        className="relative w-[600px] max-w-full rounded-[14px] bg-boardtree-surface px-8 pb-7 pt-7 text-left shadow-[0_24px_60px_rgba(30,34,55,0.30)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={is_uploading}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-[6px] text-boardtree-text-muted hover:bg-boardtree-hover disabled:opacity-50"
        >
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <h2 id={title_id} className="text-center text-boardtree-text font-heading text-dialog-title">
          Take a photo
        </h2>

        <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-[8px] bg-[#1f1f2e]">
          {camera_state === "captured" && photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo_url} alt="Captured webcam photo" className="h-full w-full object-contain" />
          ) : (
            <video ref={video_ref} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-contain" />
          )}
          {camera_state === "starting" && (
            <p className="absolute inset-0 flex items-center justify-center text-[14px] text-white/80">Starting camera…</p>
          )}
          {camera_state === "unavailable" && (
            <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-[14px] text-white/80">Camera unavailable</p>
          )}
        </div>

        {error_message && (
          <p role="alert" className="mt-3 text-[12.5px] text-boardtree-danger">
            {error_message}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          {camera_state === "captured" ? (
            <>
              <button type="button" onClick={retake} disabled={is_uploading} className={secondary_button_class}>
                Retake
              </button>
              <button type="button" onClick={upload} disabled={is_uploading} className={primary_button_class}>
                {is_uploading ? "Uploading…" : "Upload"}
              </button>
            </>
          ) : camera_state === "unavailable" ? (
            <button type="button" onClick={retake} className={secondary_button_class}>
              Try again
            </button>
          ) : (
            <button type="button" onClick={takePhoto} disabled={camera_state !== "live"} className={primary_button_class}>
              Take photo
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
