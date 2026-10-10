import type { AnnouncementTone } from "@/types/organization";

type ToneOption = {
  id: AnnouncementTone;
  label: string;
  /** Follows the app theme. */
  class_name: string;
  /** Fixed light or dark colors, for the Live preview's own Light/Dark switch. */
  light_class: string;
  dark_class: string;
};

/** Labels and colors of the announcement banner tones, shared by the banner and its editor. */
export const ANNOUNCEMENT_TONE_OPTIONS: ToneOption[] = [
  {
    id: "info",
    label: "Information",
    class_name: "bg-[#e5f4ff] text-[#0b3d75] dark:bg-[#0073ea]/20 dark:text-[#cfe6ff]",
    light_class: "bg-[#e5f4ff] text-[#0b3d75]",
    dark_class: "bg-[#0073ea]/20 text-[#cfe6ff]",
  },
  {
    id: "success",
    label: "Success",
    class_name: "bg-[#e3f6ec] text-[#0b5132] dark:bg-[#00854d]/25 dark:text-[#c8f0dc]",
    light_class: "bg-[#e3f6ec] text-[#0b5132]",
    dark_class: "bg-[#00854d]/25 text-[#c8f0dc]",
  },
  {
    id: "warning",
    label: "Warning",
    class_name: "bg-[#fff4d6] text-[#6b4b00] dark:bg-[#ffcb00]/20 dark:text-[#ffe9a8]",
    light_class: "bg-[#fff4d6] text-[#6b4b00]",
    dark_class: "bg-[#ffcb00]/20 text-[#ffe9a8]",
  },
  {
    id: "critical",
    label: "Critical",
    class_name: "bg-[#ffe2e5] text-[#7a1020] dark:bg-[#d83a52]/25 dark:text-[#ffd0d7]",
    light_class: "bg-[#ffe2e5] text-[#7a1020]",
    dark_class: "bg-[#d83a52]/25 text-[#ffd0d7]",
  },
];

export const announcementToneClass = (tone: AnnouncementTone, theme?: "light" | "dark"): string => {
  const option = ANNOUNCEMENT_TONE_OPTIONS.find((candidate) => candidate.id === tone) ?? ANNOUNCEMENT_TONE_OPTIONS[0];
  if (theme === "light") return option.light_class;
  if (theme === "dark") return option.dark_class;
  return option.class_name;
};
