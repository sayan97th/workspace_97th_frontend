/**
 * Responsive breakpoints shared by TypeScript (`useMediaQuery`) and Sass
 * (`src/styles/responsive/_breakpoints.scss`). They line up with Tailwind's
 * own `md` (768px) and `lg` (1024px) screens, so a `lg:` utility, a Sass
 * `@include tablet-down` block and a `useMediaQuery(TABLET_DOWN_QUERY)` call
 * all switch at the same width. Keep the three in sync.
 */
export const PHONE_MAX_WIDTH = 767;
export const TABLET_MAX_WIDTH = 1023;

/** Phones in portrait or landscape (the client's Pixel is 412px wide). */
export const PHONE_QUERY = `(max-width: ${PHONE_MAX_WIDTH}px)`;
/** Phones and tablets, everything that gets the off canvas sidebar. */
export const TABLET_DOWN_QUERY = `(max-width: ${TABLET_MAX_WIDTH}px)`;
/** A finger, not a mouse: hover only affordances need another way in. */
export const COARSE_POINTER_QUERY = "(pointer: coarse)";
