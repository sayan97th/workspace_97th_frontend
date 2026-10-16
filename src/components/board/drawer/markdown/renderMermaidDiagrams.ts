/**
 * Draws the ` ```mermaid ` blocks `renderRichTextMarkdown` leaves in a posted
 * body (`.rt-mermaid[data-rt-mermaid="pending"]`). Mermaid is large, so it's
 * only downloaded the first time a body actually holds a diagram. A diagram
 * that fails to parse keeps showing its source.
 */

let diagram_count = 0;

const isDarkMode = (): boolean => document.documentElement.classList.contains("dark");

export const renderMermaidDiagrams = async (container: HTMLElement, isCancelled: () => boolean): Promise<void> => {
  const blocks = Array.from(container.querySelectorAll<HTMLElement>('.rt-mermaid[data-rt-mermaid="pending"]'));
  if (!blocks.length) return;

  const { default: mermaid } = await import("mermaid");
  if (isCancelled()) return;
  mermaid.initialize({
    startOnLoad: false,
    // "strict" escapes labels and turns off click handlers, a diagram can't run script.
    securityLevel: "strict",
    theme: isDarkMode() ? "dark" : "neutral",
    fontFamily: getComputedStyle(container).fontFamily,
  });

  for (const block of blocks) {
    const source = block.querySelector(".rt-mermaid__source code")?.textContent ?? "";
    const diagram_el = block.querySelector<HTMLElement>(".rt-mermaid__diagram");
    if (!diagram_el || !source.trim()) continue;
    diagram_count += 1;
    try {
      const { svg } = await mermaid.render(`rt-mermaid-${diagram_count}`, source);
      if (isCancelled()) return;
      diagram_el.innerHTML = svg;
      block.dataset.rtMermaid = "ready";
    } catch {
      block.dataset.rtMermaid = "error";
      // Mermaid leaves its error graphic in the body when a render fails.
      document.getElementById(`drt-mermaid-${diagram_count}`)?.remove();
    }
  }
};
