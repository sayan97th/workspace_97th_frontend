/** Turns a doc title into a safe file name. */
const toFileName = (title: string, extension: string): string =>
  `${title.trim().replace(/[\\/:*?"<>|]+/g, "-") || "Doc"}.${extension}`;

/** Downloads the doc as a Markdown file. */
export const downloadMarkdown = (title: string, markdown: string) => {
  const blob = new Blob([`# ${title}\n\n${markdown}`], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = toFileName(title, "md");
  link.click();
  URL.revokeObjectURL(url);
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Longest wait for the brand font inside the print frame before printing anyway. */
const PRINT_FONT_WAIT_MS = 1500;

/**
 * The app's brand font stack (`--font-brand-sans`, see
 * `src/styles/typography.css`) resolved to real family names, so the print
 * frame, which has none of the app's CSS variables, uses the same face.
 */
const readBrandFontStack = (): string => {
  const root_style = getComputedStyle(document.documentElement);
  const brand_stack = root_style.getPropertyValue("--font-manrope").trim();
  return brand_stack ? `${brand_stack}, system-ui, sans-serif` : "system-ui, sans-serif";
};

/**
 * Copies the app's own `@font-face` rules (self-hosted by `next/font`) into
 * the print frame, so the doc prints in the brand font without loading it
 * from a third party. Cross origin stylesheets throw on read and are skipped.
 */
const readFontFaceRules = (): string => {
  const font_face_rules: string[] = [];
  for (const style_sheet of Array.from(document.styleSheets)) {
    try {
      for (const css_rule of Array.from(style_sheet.cssRules)) {
        if (css_rule instanceof CSSFontFaceRule) font_face_rules.push(css_rule.cssText);
      }
    } catch {
      // Not readable from script, nothing to copy.
    }
  }
  return font_face_rules.join("\n");
};

const buildPrintStyles = (font_stack: string) => `
  body { font-family: ${font_stack}; color: #323338; max-width: 760px; margin: 32px auto; padding: 0 24px; font-size: 15px; line-height: 1.65; }
  h1, h2, h3, h4 { font-family: ${font_stack}; font-weight: 700; line-height: 1.3; }
  img { max-width: 100%; height: auto; border-radius: 4px; }
  img[data-align="center"] { display: block; margin: 0 auto; }
  img[data-align="right"] { display: block; margin-left: auto; }
  pre { background: #f6f7fb; padding: 14px; border-radius: 6px; white-space: pre-wrap; }
  code { font-family: ui-monospace, monospace; font-size: 0.9em; }
  blockquote { border-left: 3px solid #323338; margin: 0; padding-left: 14px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #d0d4e4; padding: 6px 10px; text-align: left; }
  ul[data-type="taskList"] { list-style: none; padding-left: 4px; }
  ul[data-type="taskList"] li { display: flex; gap: 8px; }
  .doc-callout { background: #f1f1ef; border-radius: 6px; padding: 12px 16px; }
  .doc-mention { color: #0073ea; }
`;

/**
 * Prints the doc (or saves it as PDF from the print dialog) from a hidden
 * frame holding only the doc's HTML, so the app's sidebar and toolbars stay
 * out of the page. The HTML comes from the editor's own serializer.
 */
export const printDoc = (title: string, html: string) => {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const frame_document = frame.contentDocument;
  if (!frame_document || !frame.contentWindow) {
    frame.remove();
    return;
  }
  frame_document.open();
  const print_styles = `${readFontFaceRules()}\n${buildPrintStyles(readBrandFontStack())}`;
  frame_document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${print_styles}</style></head><body><h1>${escapeHtml(title)}</h1>${html}</body></html>`
  );
  frame_document.close();
  const frame_window = frame.contentWindow;
  const cleanUp = () => window.setTimeout(() => frame.remove(), 500);
  frame_window.addEventListener("afterprint", cleanUp, { once: true });
  const font_wait = new Promise((resolve) => window.setTimeout(resolve, PRINT_FONT_WAIT_MS));
  void Promise.race([frame_document.fonts.ready, font_wait]).then(() => {
    frame_window.focus();
    frame_window.print();
  });
};
