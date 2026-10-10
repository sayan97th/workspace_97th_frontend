import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SidebarCustomizePanel from "@/layout/SidebarCustomizePanel";
import { DEFAULT_SIDEBAR_PREFERENCES } from "@/layout/sidebarConstants";

const renderPanel = (sections = DEFAULT_SIDEBAR_PREFERENCES.sections) => {
  const onChange = vi.fn();
  const anchor = document.createElement("button");
  document.body.appendChild(anchor);
  render(<SidebarCustomizePanel anchor_el={anchor} is_open onClose={vi.fn()} sections={sections} onChange={onChange} />);
  return { onChange };
};

describe("SidebarCustomizePanel", () => {
  it("lists every rail section with a visibility switch, Recent starts in More", () => {
    renderPanel();
    for (const label of ["Home", "My work", "Favorites", "Automations"]) {
      expect(screen.getByRole("switch", { name: `Show ${label}` })).toHaveAttribute("aria-checked", "true");
    }
    expect(screen.getByRole("switch", { name: "Show Recent" })).toHaveAttribute("aria-checked", "false");
  });

  it("hides a section when its switch is turned off", async () => {
    const { onChange } = renderPanel();
    await userEvent.click(screen.getByRole("switch", { name: "Show Automations" }));
    expect(onChange).toHaveBeenCalledWith([
      { key: "home", is_visible: true },
      { key: "my_work", is_visible: true },
      { key: "favorites", is_visible: true },
      { key: "automations", is_visible: false },
      { key: "recent", is_visible: false },
    ]);
  });

  it("resets a custom layout to the default order", async () => {
    const { onChange } = renderPanel([
      { key: "recent", is_visible: false },
      { key: "home", is_visible: true },
      { key: "my_work", is_visible: true },
      { key: "favorites", is_visible: true },
    ]);
    await userEvent.click(screen.getByRole("button", { name: "Reset to default" }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_SIDEBAR_PREFERENCES.sections);
  });

  it("disables reset when the layout is already the default", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: "Reset to default" })).toBeDisabled();
  });
});
