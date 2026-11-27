import React from "react";
import type { RecentBoardCalendarPreview, RecentBoardPreview } from "@/types/personal";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Event bars a day cell draws before it switches to a "more" dot. */
const EVENTS_PER_DAY = 2;

const currentMonth = (): RecentBoardCalendarPreview => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    first_weekday: first.getDay(),
    day_count: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    today: now.getDate(),
    events: [],
  };
};

/**
 * A mini Calendar: the month the board's dates fall in, with each item drawn
 * as a bar in its Status (or group) color on its real day, and today circled.
 */
const CalendarPreview: React.FC<{ preview: RecentBoardPreview }> = ({ preview }) => {
  const calendar = preview.calendar ?? currentMonth();
  const month_name = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(calendar.year, calendar.month - 1, 1));

  const events_by_day = new Map<number, string[]>();
  calendar.events.forEach((event) => events_by_day.set(event.day, [...(events_by_day.get(event.day) ?? []), event.color]));

  const cell_count = Math.ceil((calendar.first_weekday + calendar.day_count) / 7) * 7;

  return (
    <div className="vp-sheet vp-calendar">
      <div className="vp-calendar__head">
        <span className="vp-calendar__month">
          {month_name} <b>{calendar.year}</b>
        </span>
        <span className="vp-calendar__nav">
          <i />
          <i />
        </span>
      </div>
      <div className="vp-calendar__grid">
        {WEEKDAYS.map((weekday, index) => (
          <span key={`weekday-${index}`} className="vp-calendar__weekday">
            {weekday}
          </span>
        ))}
        {Array.from({ length: cell_count }, (_, index) => {
          const day = index - calendar.first_weekday + 1;
          const is_in_month = day >= 1 && day <= calendar.day_count;
          const colors = is_in_month ? events_by_day.get(day) ?? [] : [];

          return (
            <span key={index} className="vp-calendar__day" data-outside={!is_in_month} data-today={day === calendar.today}>
              <span className="vp-calendar__number">{is_in_month ? day : ""}</span>
              {colors.slice(0, EVENTS_PER_DAY).map((color, event_index) => (
                <i key={event_index} className="vp-calendar__event" style={{ background: color }} />
              ))}
              {colors.length > EVENTS_PER_DAY && <i className="vp-calendar__more" />}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarPreview;
