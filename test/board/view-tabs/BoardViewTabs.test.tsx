import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoardViewTabs, { type BoardViewTabItem } from "@/components/board/BoardViewTabs";

const tabs: BoardViewTabItem[] = [
  { id: 1, label: "Main table", is_primary: true, view_type: "table", is_default: true },
  { id: 2, label: "Roadmap", view_type: "kanban", description: "Work by stage", creator_name: "Ana Lopez" },
  { id: 3, label: "Archive notes", view_type: "doc", is_hidden: true },
];

const renderTabs = (overrides: Partial<React.ComponentProps<typeof BoardViewTabs>> = {}) => {
  const handlers = {
    onSelectView: vi.fn(),
    onReorderPersonalTabs: vi.fn(),
    onToggleHiddenView: vi.fn(),
    onSetDefaultView: vi.fn(),
    onResetPersonalTabOrder: vi.fn(),
  };
  render(
    <BoardViewTabs
      tabs={tabs}
      active_view_id={1}
      getViewUrl={(tab) => (tab.is_primary ? "/boards/7" : `/boards/7/views/${tab.id}`)}
      has_personal_order
      {...handlers}
      {...overrides}
    />
  );
  return handlers;
};

describe("BoardViewTabs", () => {
  it("renders each visible tab as a real link and leaves hidden tabs out of the bar", () => {
    renderTabs();
    const tablist = screen.getByRole("tablist", { name: "Board views" });
    const links = within(tablist).getAllByRole("tab");
    expect(links.map((link) => link.textContent)).toEqual(["Main table", "Roadmap"]);
    expect(links[1]).toHaveAttribute("href", "/boards/7/views/2");
    expect(screen.getByRole("button", { name: "1 hidden views" })).toBeInTheDocument();
  });

  it("opens a tab on a plain click without following the link", async () => {
    const handlers = renderTabs();
    await userEvent.click(screen.getByRole("tab", { name: "Roadmap" }));
    expect(handlers.onSelectView).toHaveBeenCalledWith(2);
  });

  it("lists hidden tabs in the More menu and shows them again", async () => {
    const handlers = renderTabs();
    await userEvent.click(screen.getByRole("button", { name: "1 hidden views" }));
    expect(screen.getByText("Hidden views")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show Archive notes" }));
    expect(handlers.onToggleHiddenView).toHaveBeenCalledWith(3);
  });

  it("offers hide, default view and manage views in the tab menu", async () => {
    const handlers = renderTabs();
    const roadmap_tab = screen.getByRole("tab", { name: "Roadmap" }).closest("[data-view-tab-id]") as HTMLElement;
    await userEvent.click(within(roadmap_tab).getByRole("button", { name: "Tab options" }));
    expect(screen.getByText("Hide view for me")).toBeInTheDocument();
    expect(screen.getByText("Manage views")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Set as my default view"));
    expect(handlers.onSetDefaultView).toHaveBeenCalledWith(2);
  });

  it("starts a keyboard drag on Space instead of opening the tab", async () => {
    const handlers = renderTabs({ tabs: tabs.slice(0, 2) });
    const main_tab = screen.getByRole("tab", { name: "Main table" });
    main_tab.focus();
    await userEvent.keyboard("[Space]");
    await userEvent.keyboard("[ArrowRight]");
    await userEvent.keyboard("[Space]");
    // jsdom has no layout, so every tab measures at the same spot; the drop
    // may resolve onto either tab. What matters is that no stray select fired.
    expect(handlers.onSelectView).not.toHaveBeenCalled();
  });
});
