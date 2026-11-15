import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectionActionBar from "@/components/board/SelectionActionBar";

type BarProps = React.ComponentProps<typeof SelectionActionBar>;

const renderBar = (props: Partial<BarProps> = {}) => {
  const handlers = {
    onDuplicate: vi.fn(),
    onExport: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
    onConvert: vi.fn(),
    onMove: vi.fn(),
    onClose: vi.fn(),
  };
  render(
    <SelectionActionBar
      level="item"
      selected_count={2}
      group_targets={[{ id: "10", label: "New Flavor Ideas" }]}
      parent_targets={[{ id: "1", label: "Honey Apricot", hint: "New Flavor Ideas" }]}
      {...handlers}
      {...props}
    />
  );
  return handlers;
};

describe("SelectionActionBar", () => {
  test("renders nothing without a selection", () => {
    const { container } = render(
      <SelectionActionBar
        level="item"
        selected_count={0}
        group_targets={[]}
        parent_targets={[]}
        onDuplicate={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        onConvert={vi.fn()}
        onMove={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test("shows the subitem title and runs Delete for a subitem selection", async () => {
    const handlers = renderBar({ level: "subitem", selected_count: 3 });

    expect(screen.getByText("Subitems selected")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(handlers.onDelete).toHaveBeenCalledTimes(1);
  });

  test("moves subitems under the picked parent item", async () => {
    const handlers = renderBar({ level: "subitem" });

    await userEvent.click(screen.getByRole("button", { name: "Move to" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Honey Apricot/ }));

    expect(handlers.onMove).toHaveBeenCalledWith("1");
  });

  test("moves items to the picked group", async () => {
    const handlers = renderBar();

    await userEvent.click(screen.getByRole("button", { name: "Move to" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /New Flavor Ideas/ }));

    expect(handlers.onMove).toHaveBeenCalledWith("10");
  });

  test("converts subitems to items after the confirmation", async () => {
    const handlers = renderBar({ level: "subitem" });

    await userEvent.click(screen.getByRole("button", { name: "Convert" }));
    // The bar's own "Convert" opens the menu, the one inside the menu confirms.
    const confirm = screen.getAllByRole("button", { name: "Convert" }).find((button) => !button.hasAttribute("aria-haspopup"));
    await userEvent.click(confirm!);

    expect(handlers.onConvert).toHaveBeenCalledWith(null);
  });

  test("disables Convert with the reason when the items have subitems", () => {
    renderBar({ convert_disabled_reason: "Move or delete their subitems first" });

    const convert = screen.getByRole("button", { name: "Convert" });
    expect(convert).toBeDisabled();
    expect(convert).toHaveAttribute("title", "Move or delete their subitems first");
  });

  test("the close button clears the selection", async () => {
    const handlers = renderBar();
    await userEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });
});
