/**
 * Parsing and display helpers for the Column Center value types (Country,
 * World clock, Week, Hour, Color picker, Doc). Kept free of React, so the
 * table cells, the toolbar's search/sort text and the shared view page all
 * read a value the same way.
 */

/** ISO 3166-1 alpha-2 codes, names come from `Intl.DisplayNames` so they follow the viewer's language. */
const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF",
  "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG",
  "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ",
  "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH",
  "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GT", "GU", "GW", "GY", "HK", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM",
  "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY",
  "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG",
  "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT",
  "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SK", "SL", "SM", "SN",
  "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT",
  "TV", "TW", "TZ", "UA", "UG", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "XK", "YE", "YT",
  "ZA", "ZM", "ZW",
];

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

let country_names: Intl.DisplayNames | null = null;

/** The country's name in English, or the code itself when the runtime has no name for it. */
export function countryName(code: string): string {
  try {
    country_names ??= new Intl.DisplayNames(["en"], { type: "region" });
    return country_names.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** The flag emoji, built from the two regional indicator letters of the code. */
export function countryFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...code.toUpperCase().split("").map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

let country_options: CountryOption[] | null = null;

/** Every country, sorted by name. */
export function listCountries(): CountryOption[] {
  country_options ??= COUNTRY_CODES.map((code) => ({ code, name: countryName(code), flag: countryFlag(code) })).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  return country_options;
}

export const isCountryCode = (value: unknown): value is string => typeof value === "string" && /^[A-Z]{2}$/.test(value);

/** A small fallback for runtimes without `Intl.supportedValuesOf`. */
const FALLBACK_TIME_ZONES = [
  "UTC", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "America/Mexico_City",
  "America/Bogota", "America/Sao_Paulo", "America/Argentina/Buenos_Aires", "Europe/London", "Europe/Madrid",
  "Europe/Paris", "Europe/Berlin", "Africa/Cairo", "Africa/Lagos", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore",
  "Asia/Shanghai", "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland",
];

export interface TimeZoneOption {
  zone: string;
  city: string;
  region: string;
}

let time_zone_options: TimeZoneOption[] | null = null;

/** "America/Mexico_City" reads as "Mexico City". */
export function timeZoneCity(zone: string): string {
  const parts = zone.split("/");
  return (parts[parts.length - 1] ?? zone).replace(/_/g, " ");
}

/** Every IANA time zone the browser knows, sorted by city. */
export function listTimeZones(): TimeZoneOption[] {
  if (time_zone_options) return time_zone_options;
  let zones: string[] = FALLBACK_TIME_ZONES;
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone");
    if (supported?.length) zones = supported.includes("UTC") ? supported : ["UTC", ...supported];
  } catch {
    // Older runtime, keep the fallback list.
  }
  time_zone_options = zones
    .map((zone) => ({ zone, city: timeZoneCity(zone), region: zone.includes("/") ? zone.split("/")[0].replace(/_/g, " ") : "" }))
    .sort((a, b) => a.city.localeCompare(b.city));
  return time_zone_options;
}

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** The current time in `zone`, "10:42 AM". */
export function timeInZone(zone: string, now: number = Date.now()): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(now);
  } catch {
    return "";
  }
}

/** The zone's offset from UTC right now, "GMT-6". */
export function zoneOffsetLabel(zone: string, now: number = Date.now()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(now);
    return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/** Whether it is daytime (6 AM to 6 PM) in `zone`, the cell shows a sun or a moon. */
export function isDaytimeInZone(zone: string, now: number = Date.now()): boolean {
  try {
    const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", hourCycle: "h23" }).format(now));
    return hour >= 6 && hour < 18;
  } catch {
    return true;
  }
}

const HOUR_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isHourValue = (value: unknown): value is string => typeof value === "string" && HOUR_PATTERN.test(value);

/** "14:30" reads as "2:30 PM", or stays "14:30" in 24 hour format. */
export function formatHour(value: string, is_24_hour = false): string {
  const match = HOUR_PATTERN.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  if (is_24_hour) return `${match[1]}:${match[2]}`;
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${suffix}`;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** A local date as `YYYY-MM-DD`. */
export const toIsoDay = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** `YYYY-MM-DD` parsed as a local date, so it never shifts a day west of UTC. */
export function parseIsoDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The Monday of the week holding `date`, weeks start on Monday like monday.com's Week column. */
export function startOfIsoWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  return start;
}

export const isWeekValue = (value: unknown): value is string => typeof value === "string" && parseIsoDay(value) !== null;

/** The ISO week number (1 to 53). */
export function isoWeekNumber(date: Date): number {
  // The week's Thursday decides which year the week belongs to.
  const thursday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
  const year_start = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.ceil(((thursday.getTime() - year_start) / 86400000 + 1) / 7);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A week value as "Oct 12 - 18", or "Sep 28 - Oct 4" across months, with the year when it is not this year. */
export function formatWeekRange(value: string): string {
  const start = parseIsoDay(value);
  if (!start) return value;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const year = end.getFullYear() !== new Date().getFullYear() ? `, ${end.getFullYear()}` : "";
  const end_label = end.getMonth() === start.getMonth() ? String(end.getDate()) : `${MONTHS[end.getMonth()]} ${end.getDate()}`;
  return `${MONTHS[start.getMonth()]} ${start.getDate()} - ${end_label}${year}`;
}

export const isHexColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);

/** monday.com's color picker palette, row by row. */
export const COLOR_PICKER_PALETTE = [
  "#00c875", "#9cd326", "#cab641", "#ffcb00", "#784bd1", "#a25ddc", "#0086c0", "#579bfc",
  "#66ccff", "#bb3354", "#e2445c", "#ff158a", "#ff5ac4", "#ff642e", "#fdab3d", "#7f5347",
  "#c4c4c4", "#808080", "#333333", "#037f4c", "#225091", "#175a63", "#ffadad", "#ffffff",
];

/** A Doc cell's title, empty for an empty cell. */
export function docCellTitle(value: unknown): string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return "";
  const title = (value as { title?: unknown }).title;
  return typeof title === "string" ? title : "";
}

/**
 * A Column Center value as plain text, for surfaces without the table's own
 * pickers (the Kanban item card). Null for the computed kinds, which have no
 * stored value to show there.
 */
export function formatColumnCenterValue(kind: string, value: unknown): string | null {
  switch (kind) {
    case "country":
      return isCountryCode(value) ? `${countryFlag(value)} ${countryName(value)}` : "";
    case "world_clock":
      return isTimeZone(value) ? `${timeInZone(value)} ${timeZoneCity(value)}` : "";
    case "week":
      return isWeekValue(value) ? formatWeekRange(value) : "";
    case "hour":
      return isHourValue(value) ? formatHour(value) : "";
    case "color_picker":
      return isHexColor(value) ? value.toUpperCase() : "";
    case "location":
      return typeof value === "string" ? value : "";
    case "doc":
      return docCellTitle(value);
    default:
      return null;
  }
}

/** The Column Center kinds `formatColumnCenterValue` knows, plus the computed ones. */
export const COLUMN_CENTER_KINDS = [
  "country", "world_clock", "week", "hour", "color_picker", "location", "doc",
  "creation_log", "last_updated", "item_number", "progress_tracking",
];
