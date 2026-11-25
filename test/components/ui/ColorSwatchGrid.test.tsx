import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ColorSwatchGrid from "@/components/ui/color-swatch-grid/ColorSwatchGrid";
import { PALETTE, PALETTE_SWATCHES } from "@/lib/color-palette";
import { readRecentCustomColors } from "@/lib/recent-custom-colors";

const swatch = (name: string, hex: string) => screen.getByRole("radio", { name: `${name}, ${hex}` });

describe("ColorSwatchGrid", () => {
  test("offers Tonk's palette as one radio group", () => {
    render(<ColorSwatchGrid value={null} onSelect={vi.fn()} aria_label="Label color" />);
    expect(screen.getByRole("radiogroup", { name: "Label color" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(PALETTE_SWATCHES.length);
    expect(screen.getByText("Pick a color")).toBeInTheDocument();
  });

  test("checks the current color, ignoring case", () => {
    render(<ColorSwatchGrid value={PALETTE.sky.toUpperCase()} onSelect={vi.fn()} />);
    expect(swatch("Sky", PALETTE.sky)).toHaveAttribute("aria-checked", "true");
    expect(swatch("Red", PALETTE.red)).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Sky")).toBeInTheDocument();
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
    render(<ColorSwatchGrid value={PALETTE.blue} onSelect={vi.fn()} />);
    const tab_stops = screen.getAllByRole("radio").filter((element) => element.tabIndex === 0);
    expect(tab_stops).toEqual([swatch("Blue", PALETTE.blue)]);

    swatch("Blue", PALETTE.blue).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(swatch("Ocean", PALETTE.ocean)).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(swatch("Jade", PALETTE.jade)).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(swatch("Silver", PALETTE.silver)).toHaveFocus();
  });

  test("a disabled grid ignores clicks", async () => {
    const onSelect = vi.fn();
    render(<ColorSwatchGrid value={null} onSelect={onSelect} disabled />);
    await userEvent.click(swatch("Red", PALETTE.red));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("ColorSwatchGrid custom color", () => {
  beforeEach(() => localStorage.clear());

  const openCustom = async () => userEvent.click(screen.getByRole("button", { name: "Custom color" }));

  test("a typed hex is applied, lowercased, and remembered under Recent", async () => {
    const onSelect = vi.fn();
    const { unmount } = render(<ColorSwatchGrid value={PALETTE.red} onSelect={onSelect} />);
    await openCustom();

    const field = screen.getByRole("textbox", { name: "Hex color" });
    await userEvent.clear(field);
    await userEvent.type(field, "FDAB3D{Enter}");
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("#fdab3d");
    expect(readRecentCustomColors()).toEqual(["#fdab3d"]);
    unmount();

    render(<ColorSwatchGrid value="#fdab3d" onSelect={vi.fn()} />);
    expect(screen.getByText("Recent")).toBeInTheDocument();
    expect(swatch("Custom", "#fdab3d")).toHaveAttribute("aria-checked", "true");
  });

  test("an invalid hex cannot be applied", async () => {
    render(<ColorSwatchGrid value={null} onSelect={vi.fn()} />);
    await openCustom();
    const field = screen.getByRole("textbox", { name: "Hex color" });
    await userEvent.clear(field);
    await userEvent.type(field, "12");
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  test("Back and Escape return to the palette without picking", async () => {
    const onSelect = vi.fn();
    render(<ColorSwatchGrid value={PALETTE.red} onSelect={onSelect} />);
    await openCustom();
    await userEvent.click(screen.getByRole("button", { name: "Back to palette" }));
    expect(screen.getAllByRole("radio")).toHaveLength(PALETTE_SWATCHES.length);

    await openCustom();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("textbox", { name: "Hex color" })).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("the arrow keys move the hue slider", async () => {
    render(<ColorSwatchGrid value="#ff0000" onSelect={vi.fn()} />);
    await openCustom();
    const hue = screen.getByRole("slider", { name: "Hue" });
    hue.focus();
    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(hue).toHaveAttribute("aria-valuenow", "10");
    expect(screen.getByRole("textbox", { name: "Hex color" })).toHaveValue("FF2A00");
  });

  test("allow_custom false hides the Custom color button", () => {
    render(<ColorSwatchGrid value={null} onSelect={vi.fn()} allow_custom={false} />);
    expect(screen.queryByRole("button", { name: "Custom color" })).not.toBeInTheDocument();
  });
});
