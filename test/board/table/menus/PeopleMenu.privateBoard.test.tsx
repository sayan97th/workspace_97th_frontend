import { beforeAll, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PeopleMenu from "@/components/board/table/menus/PeopleMenu";
import { BoardPrivacyProvider } from "@/components/board/privacy/BoardPrivacyContext";
import type { PersonDef } from "@/components/board/table/types";

// The client asked that private boards be completely private: nobody outside the board can be
// assigned or notified. The picker says so, and flags people assigned before the board went private.

const people: PersonDef[] = [
  { id: "1", name: "Amanda McKay", initials: "AM", color: "#579bfc" },
  { id: "3", name: "Britni Dillard", initials: "BD", color: "#e2445c", is_outside_board: true },
];

const renderMenu = ({ is_private_board, selected = [], onInviteClick, onClose = vi.fn() }: {
  is_private_board: boolean;
  selected?: string[];
  onInviteClick?: () => void;
  onClose?: () => void;
}) =>
  render(
    <BoardPrivacyProvider value={{ is_private_board, onInviteClick }}>
      <PeopleMenu people={people} selected={selected} query="" onQueryChange={vi.fn()} onChange={vi.fn()} onClose={onClose} />
    </BoardPrivacyProvider>
  );

describe("PeopleMenu on a private board", () => {
  beforeAll(() => {
    if (!document.elementsFromPoint) document.elementsFromPoint = () => [];
  });

  test("shows the private board notice only on private boards", () => {
    const { unmount } = renderMenu({ is_private_board: true });
    expect(screen.getByText("Private board")).toBeInTheDocument();
    expect(screen.getByText("Only people on this board can be assigned or notified.")).toBeInTheDocument();
    unmount();

    renderMenu({ is_private_board: false });
    expect(screen.queryByText("Private board")).not.toBeInTheDocument();
  });

  test("Invite to board closes the picker and opens the invite dialog", () => {
    const onInviteClick = vi.fn();
    const onClose = vi.fn();
    renderMenu({ is_private_board: true, onInviteClick, onClose });

    fireEvent.click(screen.getByRole("button", { name: "Invite to board" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onInviteClick).toHaveBeenCalledTimes(1);
  });

  test("flags someone assigned before the board went private as having no access", () => {
    renderMenu({ is_private_board: true, selected: ["3"] });

    const chip = screen.getByTitle("Britni Dillard has no access to this private board and is not notified");
    expect(chip).toHaveClass("people-picker__chip--no-access");
    expect(screen.getByLabelText("No access")).toBeInTheDocument();
  });
});
