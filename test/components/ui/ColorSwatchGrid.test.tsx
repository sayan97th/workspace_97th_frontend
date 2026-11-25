import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ColorSwatchGrid from "@/components/ui/color-swatch-grid/ColorSwatchGrid";
import { PALETTE, PALETTE_SWATCHES } from "@/lib/color-palette";

const swatch = (name: string, hex: string) => screen.getByRole("radio", { name: `${name}, ${hex}` });

describe("ColorSwatchGrid", () => {
  test("offers Tonk's palette as one radio group", () => {
    render(<ColorSwatchGrid value={null} onSelect={vi.fn()} aria_label="Label color" />);
    expect(screen.getByRole("radiogroup", { name: "Label color" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(PALETTE_SWATCHES.length);
    expect(screen.getByText("Pick a color")).toBeInTheDocument();
  });

  test("checks the current color, ignoring case", () => {
    render(<ColorSwatchGrid value={PALETTE.teal.toUpperCase()} onSelect={vi.fn()} />);
    expect(swatch("Teal", PALETTE.teal)).toHaveAttribute("aria-checked", "true");
    expect(swatch("Red", PALETTE.red)).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Teal")).toBeInTheDocument();
  });

  test("names a color outside the palette as Custom", () => {
    render(<ColorSwatchGrid value="#00c875" onSelect={vi.fn()} />);
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByText("00C875")).toBeInTheDocument();
  });

  test("clicking a swatch reports its hex", async () => {
    const onSelect = vi.fn();
    render(<ColorSwatchGrid value={null} onSelect={onSelect} />);
    await userEvent.click(swatch("Plum", PALETTE.plum));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(PALETTE.plum);
  });

  test("has one tab stop and arrow keys move across rows", async () => {
    render(<ColorSwatchGrid value={PALETTE.red} onSelect={vi.fn()} />);
    const tab_stops = screen.getAllByRole("radio").filter((element) => element.tabIndex === 0);
    expect(tab_stops).toEqual([swatch("Red", PALETTE.red)]);

    swatch("Red", PALETTE.red).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(swatch("Crimson", PALETTE.crimson)).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(swatch("Sage", PALETTE.sage)).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(swatch("Charcoal", PALETTE.charcoal)).toHaveFocus();
  });

  test("a disabled grid ignores clicks", async () => {
    const onSelect = vi.fn();
    render(<ColorSwatchGrid value={null} onSelect={onSelect} disabled />);
    await userEvent.click(swatch("Red", PALETTE.red));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
