"use client";
import React, { useEffect, useRef } from "react";

/** A muted, mirrored live view of a camera stream (the selfie view people expect). */
export function LiveCameraView({ stream, className }: { stream: MediaStream | null; className?: string }) {
  const video_ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = video_ref.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) void video.play().catch(() => {});
  }, [stream]);

  return <video ref={video_ref} className={`screen-recorder__camera-video ${className ?? ""}`} muted playsInline autoPlay aria-hidden="true" />;
}

const METER_BARS = 5;

/**
 * Five bars that bounce with the microphone, like Loom's mic check. Drawn
 * straight on the DOM from an analyser every frame, so the level never causes
 * a React render.
 */
export function MicrophoneLevelMeter({ stream, className }: { stream: MediaStream | null; className?: string }) {
  const bars_ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const bars = bars_ref.current ? Array.from(bars_ref.current.children) as HTMLElement[] : [];
    const reset = () => bars.forEach((bar) => bar.style.setProperty("--level", "0"));
    if (!stream || stream.getAudioTracks().length === 0) {
      reset();
      return;
    }
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    // Safari starts it suspended outside a click, the meter would stay flat.
    void context.resume().catch(() => {});
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let frame = 0;

    const draw = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
      const level = Math.min(1, Math.sqrt(sum / samples.length) * 3.4);
      bars.forEach((bar, index) => {
        // Middle bars react the most, the outer ones trail a little.
        const weight = 1 - Math.abs(index - (METER_BARS - 1) / 2) * 0.22;
        bar.style.setProperty("--level", String(Math.min(1, level * weight)));
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      void context.close();
      reset();
    };
  }, [stream]);

  return (
    <span ref={bars_ref} className={`screen-recorder__meter ${className ?? ""}`} aria-hidden="true">
      {Array.from({ length: METER_BARS }, (_, index) => (
        <span key={index} className="screen-recorder__meter-bar" />
      ))}
    </span>
  );
}
