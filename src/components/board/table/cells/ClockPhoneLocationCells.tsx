"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { BoardTableGroup, CellValue } from "../types";
import {
  countryFlag,
  countryName,
  dateTimeInZone,
  formatPhoneNumber,
  isDaytimeInZone,
  isTimeZone,
  listTimeZones,
  localTimeZone,
  mapsSearchUrl,
  phoneCountry,
  phoneHref,
  PHONE_MAX_LENGTH,
  sanitizePhoneInput,
  timeInZone,
  timeZoneCity,
  timeZoneLabel,
  zoneOffsetLabel,
} from "../columnValueFormats";
import { containsSearchQuery, highlightSearchMatches } from "../searchHighlight";
import InlineSearchPicker, { type InlineSearchOption } from "../menus/InlineSearchPicker";
import { useCellTooltip } from "./CellTooltip";
import type { ColumnCenterCellProps } from "./ColumnCenterCells";
import "../menus/inline-search-picker.css";
import "./clock-phone-location-cells.css";

const asString = (value: CellValue): string => (typeof value === "string" ? value : "");

/* ---- shared pieces ------------------------------------------------------ */

const ClockGlyph = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 4.75V8l2.25 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PhoneGlyph = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
    <rect x="4.25" y="1.75" width="7.5" height="12.5" rx="1.75" stroke="currentColor" strokeWidth="1.3" />
    <path d="M7 11.75h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const PinGlyph = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true">
    <path d="M8 14.25s4.5-4 4.5-7.75a4.5 4.5 0 0 0-9 0c0 3.75 4.5 7.75 4.5 7.75z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <circle cx="8" cy="6.5" r="1.6" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

/** monday's empty cell affordance: a faint "+" and the column's own icon, shown on hover. */
function EmptyCellHint({ icon }: { icon: ReactNode }) {
  return (
    <span className="value-cell__add" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
        <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {icon}
    </span>
  );
}

/** The hover "×" that empties a cell, the same one Link and Files cells show. */
function RemoveButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button type="button" className="value-cell__remove" aria-label={label} title={label} onClick={onRemove}>
      <svg viewBox="0 0 14 14" width="10" height="10" aria-hidden="true">
        <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/** Text that shows a dark tooltip on hover, only when `only_when_truncated` and it is cut off by the ellipsis. */
interface TooltipTextProps {
  text: ReactNode;
  tooltip: string;
  className: string;
  only_when_truncated?: boolean;
  /** The text sits above the cell's hit area, so it forwards clicks to open the editor too. */
  onClick?: () => void;
}

function TooltipText({ text, tooltip, className, only_when_truncated = false, onClick }: TooltipTextProps) {
  const { anchor_props, hide, tooltip: bubble } = useCellTooltip<HTMLSpanElement>(tooltip, { only_when_truncated });
  return (
    <>
      <span
        {...anchor_props}
        onClick={() => {
          hide();
          onClick?.();
        }}
        className={className}
      >
        {text}
      </span>
      {bubble}
    </>
  );
}

/* ---- World clock -------------------------------------------------------- */

/** Re-renders every 30 seconds while mounted, for the World clock's live time. */
function useMinuteTick(is_active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!is_active) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [is_active]);
  return now;
}

const SunGlyph = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <circle cx="8" cy="8" r="3" fill="currentColor" />
    <path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.6 3.6l1 1M11.4 11.4l1 1M3.6 12.4l1-1M11.4 4.6l1-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const MoonGlyph = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d="M12.75 10.1A5.25 5.25 0 0 1 5.9 3.25a5.25 5.25 0 1 0 6.85 6.85z" fill="currentColor" />
  </svg>
);

function WorldClockPicker({ value, onPick, onClear, onClose }: { value: string | null; onPick: (zone: string) => void; onClear: () => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const now = useMemo(() => Date.now(), []);
  const local_zone = useMemo(localTimeZone, []);

  // Every zone once, alphabetical by its full name like monday's list, the viewer's own zone first.
  const all_options = useMemo(() => {
    const zones = listTimeZones()
      .map((entry) => entry.zone)
      .sort((a, b) => a.localeCompare(b));
    const ordered = local_zone && zones.includes(local_zone) ? [local_zone, ...zones.filter((zone) => zone !== local_zone)] : zones;
    return ordered.map((zone) => ({
      id: zone,
      label: timeZoneLabel(zone),
      hint: timeInZone(zone, now),
      title: `${timeZoneLabel(zone)} (${zoneOffsetLabel(zone, now)})${zone === local_zone ? ", your time zone" : ""}`,
    }));
  }, [local_zone, now]);

  const term = query.trim().toLowerCase().replace(/[\s_]+/g, " ");
  const options = term ? all_options.filter((option) => option.label.toLowerCase().includes(term)) : all_options;

  return (
    <InlineSearchPicker
      variant="list"
      placeholder="Timezone"
      query={query}
      onQueryChange={setQuery}
      options={options}
      selected_id={value}
      onPick={(zone) => {
        onPick(zone);
        onClose();
      }}
      onClose={onClose}
      empty_label="No time zone found"
      footer={
        value && (
          <button
            type="button"
            className="inline-search__action"
            onClick={() => {
              onClear();
              onClose();
            }}
          >
            Clear time zone
          </button>
        )
      }
    />
  );
}

export function WorldClockCell({ node_id, column, value, actions, is_menu_open, openMenu }: ColumnCenterCellProps) {
  const zone = isTimeZone(value) ? value : null;
  const now = useMinuteTick(zone !== null);
  const can_edit = actions.canEditCell(node_id, column.id);
  const is_day = zone ? isDaytimeInZone(zone, now) : true;
  // The whole cell carries the tooltip, its full zone name, offset and local date.
  const { anchor_props, hide, tooltip } = useCellTooltip<HTMLButtonElement>(
    zone && !is_menu_open ? `${timeZoneLabel(zone)} (${zoneOffsetLabel(zone, now)}), ${dateTimeInZone(zone, now)}` : ""
  );

  return (
    <div className="value-cell">
      <button
        {...anchor_props}
        type="button"
        onClick={() => {
          hide();
          if (can_edit) openMenu();
        }}
        disabled={!can_edit && !zone}
        aria-label={zone ? `Time in ${timeZoneCity(zone)}, change time zone` : "Choose a time zone"}
        className="value-cell__hit-area"
        data-readonly={!can_edit || undefined}
      />
      {tooltip}
      <div className="value-cell__content">
        {zone ? (
          <span className="value-cell__clock">
            <span className={`value-cell__daytime ${is_day ? "is-day" : "is-night"}`} aria-label={is_day ? "Daytime" : "Nighttime"}>
              {is_day ? <SunGlyph /> : <MoonGlyph />}
            </span>
            <span className="value-cell__time">{timeInZone(zone, now)}</span>
            <span className="value-cell__secondary">{timeZoneCity(zone)}</span>
          </span>
        ) : (
          can_edit && <EmptyCellHint icon={<ClockGlyph />} />
        )}
      </div>
      {is_menu_open && can_edit && (
        <WorldClockPicker
          value={zone}
          onPick={(next) => actions.setCellValue(node_id, column.id, next)}
          onClear={() => actions.clearCellValue(node_id, column.id)}
          onClose={actions.closeCellMenu}
        />
      )}
    </div>
  );
}

/* ---- Phone -------------------------------------------------------------- */

/**
 * The open Phone cell: an outlined field right in the cell. Enter or a click
 * elsewhere saves, Escape drops the edit. Saving once, on commit, keeps the
 * board from sending a request per keystroke.
 */
function PhoneEditor({ initial_value, onCommit, onClose }: { initial_value: string; onCommit: (phone: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(initial_value);
  const draft_ref = useRef(draft);
  const is_done_ref = useRef(false);

  const finish = (should_save: boolean) => {
    if (is_done_ref.current) return;
    is_done_ref.current = true;
    if (should_save) onCommit(draft_ref.current.trim());
    onClose();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  };

  return (
    <div className="inline-search-field value-cell__editor">
      <input
        autoFocus
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={draft}
        maxLength={PHONE_MAX_LENGTH}
        onChange={(event) => {
          const next = sanitizePhoneInput(event.target.value);
          draft_ref.current = next;
          setDraft(next);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => finish(true)}
        placeholder="1 (123) 123 4567"
        aria-label="Phone number"
        className="inline-search-field__input value-cell__editor-input"
      />
    </div>
  );
}

function PhoneLink({ phone, search_query }: { phone: string; search_query: string }) {
  const formatted = formatPhoneNumber(phone);
  const href = phoneHref(phone);
  const { anchor_props, hide, tooltip } = useCellTooltip<HTMLAnchorElement>(href ? `Call ${formatted}` : formatted);
  const text = containsSearchQuery(phone, search_query) ? highlightSearchMatches(phone, search_query) : formatted;
  if (!href) return <span className="value-cell__text">{text}</span>;
  return (
    <>
      <a {...anchor_props} href={href} onClick={hide} className="value-cell__link">
        {text}
      </a>
      {tooltip}
    </>
  );
}

export function PhoneCell({ node_id, column, value, state, actions, is_menu_open, openMenu }: ColumnCenterCellProps) {
  const phone = asString(value).trim();
  const can_edit = actions.canEditCell(node_id, column.id);
  const country = phone ? phoneCountry(phone) : null;

  if (is_menu_open && can_edit) {
    return (
      <PhoneEditor
        initial_value={phone}
        onCommit={(next) => {
          if (next === phone) return;
          if (next) actions.setCellValue(node_id, column.id, next);
          else actions.clearCellValue(node_id, column.id);
        }}
        onClose={actions.closeCellMenu}
      />
    );
  }

  return (
    <div className="value-cell">
      <button
        type="button"
        onClick={can_edit ? openMenu : undefined}
        disabled={!can_edit}
        aria-label={phone ? `Edit phone ${phone}` : "Add a phone number"}
        className="value-cell__hit-area"
      />
      <div className="value-cell__content">
        {phone ? (
          <>
            {country && (
              <TooltipText className="value-cell__flag" tooltip={countryName(country)} text={countryFlag(country)} onClick={can_edit ? openMenu : undefined} />
            )}
            <PhoneLink phone={phone} search_query={state.search_query} />
            {can_edit && <RemoveButton label="Remove phone number" onRemove={() => actions.clearCellValue(node_id, column.id)} />}
          </>
        ) : (
          can_edit && <EmptyCellHint icon={<PhoneGlyph />} />
        )}
      </div>
    </div>
  );
}

/* ---- Location ----------------------------------------------------------- */

/** monday's own suggestions before anything is typed, filled in after the addresses already used on the board. */
const SUGGESTED_PLACES = [
  { name: "Giza Pyramid Complex", area: "Giza, Egypt" },
  { name: "Colosseum", area: "Rome, Italy" },
  { name: "Machu Picchu", area: "Cusco, Peru" },
  { name: "Petra", area: "Ma'an, Jordan" },
  { name: "Taj Mahal", area: "Agra, India" },
];

/** How many rows the Location card lists at most. */
const LOCATION_RESULT_LIMIT = 8;
/** The id of the row that saves exactly what was typed. */
const TYPED_ADDRESS_PREFIX = "typed:";

/** The addresses this column already holds across the board, most used first. */
function boardLocations(groups: BoardTableGroup[], column_id: string): string[] {
  const counts = new Map<string, number>();
  const count = (entry: CellValue) => {
    const address = asString(entry).trim();
    if (address) counts.set(address, (counts.get(address) ?? 0) + 1);
  };
  for (const group of groups) {
    for (const item of group.items) {
      count(item.values[column_id]);
      for (const sub of item.subs) count(sub.values[column_id]);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([address]) => address);
}

interface LocationPickerProps {
  value: string | null;
  known_addresses: string[];
  onPick: (address: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function LocationPicker({ value, known_addresses, onPick, onClear, onClose }: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const typed = query.trim();
  const term = typed.toLowerCase();

  const options = useMemo(() => {
    const seen = new Set<string>();
    const result: InlineSearchOption[] = [];
    const add = (option: InlineSearchOption) => {
      const key = option.id.toLowerCase();
      if (seen.has(key) || result.length >= LOCATION_RESULT_LIMIT) return;
      seen.add(key);
      result.push({ ...option, leading: <span className="inline-search__pin"><PinGlyph /></span> });
    };

    const known = [...(value ? [value] : []), ...known_addresses];
    const places = SUGGESTED_PLACES.map((place) => ({ id: `${place.name}, ${place.area}`, label: place.name, hint: place.area }));
    if (term) {
      // The typed address comes first, so Enter saves it unless a match is picked.
      add({ id: `${TYPED_ADDRESS_PREFIX}${typed}`, label: typed, hint: "Use this address" });
      seen.add(term);
      known.filter((address) => address.toLowerCase().includes(term)).forEach((address) => add({ id: address, label: address }));
      places.filter((place) => place.id.toLowerCase().includes(term)).forEach(add);
    } else {
      known.forEach((address) => add({ id: address, label: address }));
      places.forEach(add);
    }
    return result;
  }, [known_addresses, term, typed, value]);

  return (
    <InlineSearchPicker
      variant="card"
      title="Location"
      placeholder="Search location"
      query={query}
      onQueryChange={setQuery}
      options={options}
      selected_id={value}
      onPick={(id) => {
        onPick(id.startsWith(TYPED_ADDRESS_PREFIX) ? id.slice(TYPED_ADDRESS_PREFIX.length) : id);
        onClose();
      }}
      onClose={onClose}
      empty_label="Type an address to add it"
      footer={
        value && (
          <>
            <a href={mapsSearchUrl(value)} target="_blank" rel="noopener noreferrer" className="inline-search__action inline-search__action--link">
              <PinGlyph size={14} />
              Open in Google Maps
            </a>
            <button
              type="button"
              className="inline-search__action"
              onClick={() => {
                onClear();
                onClose();
              }}
            >
              Remove location
            </button>
          </>
        )
      }
    />
  );
}

function MapPinLink({ address }: { address: string }) {
  const { anchor_props, hide, tooltip } = useCellTooltip<HTMLAnchorElement>("Open in Google Maps");
  return (
    <>
      <a
        {...anchor_props}
        href={mapsSearchUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={hide}
        aria-label={`Open ${address} in Google Maps`}
        className="value-cell__pin"
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M8 14.5s4.75-4.2 4.75-8.1a4.75 4.75 0 0 0-9.5 0c0 3.9 4.75 8.1 4.75 8.1z" fill="currentColor" />
          <circle cx="8" cy="6.4" r="1.75" fill="#ffffff" />
        </svg>
      </a>
      {tooltip}
    </>
  );
}

export function LocationCell({ node_id, column, value, state, actions, is_menu_open, openMenu }: ColumnCenterCellProps) {
  const address = asString(value).trim();
  const can_edit = actions.canEditCell(node_id, column.id);
  const known_addresses = useMemo(
    () => (is_menu_open ? boardLocations(state.groups, column.id).filter((entry) => entry !== address) : []),
    [is_menu_open, state.groups, column.id, address]
  );

  return (
    <div className="value-cell">
      <button
        type="button"
        onClick={can_edit ? openMenu : undefined}
        disabled={!can_edit}
        aria-label={address ? `Change location ${address}` : "Add a location"}
        className="value-cell__hit-area"
      />
      <div className="value-cell__content value-cell__content--start">
        {address ? (
          <>
            <MapPinLink address={address} />
            <TooltipText
              className="value-cell__text"
              tooltip={address}
              only_when_truncated
              onClick={can_edit ? openMenu : undefined}
              text={containsSearchQuery(address, state.search_query) ? highlightSearchMatches(address, state.search_query) : address}
            />
            {can_edit && <RemoveButton label="Remove location" onRemove={() => actions.clearCellValue(node_id, column.id)} />}
          </>
        ) : (
          can_edit && <EmptyCellHint icon={<PinGlyph />} />
        )}
      </div>
      {is_menu_open && can_edit && (
        <LocationPicker
          value={address || null}
          known_addresses={known_addresses}
          onPick={(next) => actions.setCellValue(node_id, column.id, next)}
          onClear={() => actions.clearCellValue(node_id, column.id)}
          onClose={actions.closeCellMenu}
        />
      )}
    </div>
  );
}
