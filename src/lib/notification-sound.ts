/**
 * A short two-note chime for a live notification, synthesized with the Web
 * Audio API so no sound file has to ship. Whether the user wants it at all is
 * `notification_sound_enabled` on their profile. Browsers keep audio locked
 * until the person has interacted with the page, so a chime that arrives
 * before that is dropped silently rather than raising an error.
 */

const NOTES: { frequency_hz: number; start_seconds: number }[] = [
  { frequency_hz: 880, start_seconds: 0 },
  { frequency_hz: 1174.66, start_seconds: 0.12 },
];

const NOTE_DURATION_SECONDS = 0.18;
const PEAK_GAIN = 0.08;

let audio_context: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (audio_context) return audio_context;

  const AudioContextClass =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  audio_context = new AudioContextClass();
  return audio_context;
};

/** Plays the chime once. Never throws, a blocked or unsupported audio device just stays quiet. */
export function playNotificationSound(): void {
  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") void context.resume();

    const now = context.currentTime;
    for (const note of NOTES) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + note.start_seconds;

      oscillator.type = "sine";
      oscillator.frequency.value = note.frequency_hz;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + NOTE_DURATION_SECONDS);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + NOTE_DURATION_SECONDS);
    }
  } catch {
    // Audio is a nicety, never worth surfacing an error for.
  }
}
