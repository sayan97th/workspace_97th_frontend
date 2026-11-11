import React from "react";

type GlyphProps = { size?: number; className?: string };

/** Shared 24px stroke canvas so every glyph lines up with the sentence text. */
const Glyph: React.FC<GlyphProps & { children: React.ReactNode }> = ({ size = 15, className, children }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const AtGlyph: React.FC<GlyphProps> = (props) => (
  <Glyph {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
  </Glyph>
);

const PersonGlyph: React.FC<GlyphProps> = (props) => (
  <Glyph {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Glyph>
);

const BellGlyph: React.FC<GlyphProps> = (props) => (
  <Glyph {...props}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Glyph>
);

const ReplyGlyph: React.FC<GlyphProps> = (props) => (
  <Glyph {...props}>
    <path d="M9 17l-5-5 5-5" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </Glyph>
);

const ThumbsUpGlyph: React.FC<GlyphProps> = (props) => (
  <Glyph {...props}>
    <path d="M7 10v12" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
  </Glyph>
);

const ClockGlyph: React.FC<GlyphProps> = (props) => (
  <Glyph {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Glyph>
);

const BoltGlyph: React.FC<GlyphProps> = (props) => (
  <Glyph {...props}>
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
  </Glyph>
);

/** The cog on the drawer header that opens the notification settings. */
export const NotificationSettingsGlyph: React.FC<GlyphProps> = ({ size = 20, className }) => (
  <Glyph size={size} className={className}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </Glyph>
);

/** The board glyph in front of the board name, a table with a header row and a name column. */
export const NotificationBoardGlyph: React.FC<GlyphProps> = ({ size = 12, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1.75" stroke="currentColor" strokeWidth="1.5" />
    <path d="M1.75 6.25h12.5M6 6.25v7.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const TYPE_GLYPHS: Record<string, React.FC<GlyphProps>> = {
  mentioned: AtGlyph,
  assigned: PersonGlyph,
  notified: BellGlyph,
  replied_thread: ReplyGlyph,
  replied_update: ReplyGlyph,
  reactions: ThumbsUpGlyph,
  due_date_reminder: ClockGlyph,
  automations_notify: BoltGlyph,
};

/**
 * The small glyph monday puts in front of the highlighted action ("@ Mentioned
 * you", a person for "Assigned you"), picked from the backend notification
 * type. Renders nothing for a type without one.
 */
const NotificationTypeIcon: React.FC<GlyphProps & { type: string }> = ({ type, ...props }) => {
  const TypeGlyph = TYPE_GLYPHS[type];
  return TypeGlyph ? <TypeGlyph {...props} /> : null;
};

export default NotificationTypeIcon;
