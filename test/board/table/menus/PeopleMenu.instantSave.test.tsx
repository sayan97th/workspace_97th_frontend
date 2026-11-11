import { beforeAll, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PeopleMenu from "@/components/board/table/menus/PeopleMenu";
import type { PersonDef } from "@/components/board/table/types";

// The client asked to drop the "Save" step: picking or removing someone assigns them right away.

const people: PersonDef[] = [
  { id: "1", name: "Amanda McKay", initials: "AM", color: "#579bfc", job_title: "EA to CEO" },
  { id: "2", name: "Brandon Stauffer", initials: "BS", color: "#a25ddc" },
  { id: "3", name: "Brayden Hatch", initials: "BH", color: "#00c875" },
];

const renderMenu = (selected: string[] = []) => {
  const onChange = vi.fn();
  const onClose = vi.fn();
  render(<PeopleMenu people={people} selected={selected} query="" onQueryChange={vi.fn()} onChange={onChange} onClose={onClose} />);
  return { onChange, onClose };
};

/** The listbox row for a person, found by its "Name (Job title)" label. */
const pickOption = (label: string) => screen.getByText(label).closest('[role="option"]') as HTMLElement;

describe("PeopleMenu instant save", () => {
  beforeAll(() => {
    // jsdom has no hit testing, the popover only uses it to follow a scrolled away anchor.
    if (!document.elementsFromPoint) document.elementsFromPoint = () => [];
  });

  test("has no Save or Cancel buttons", () => {
    renderMenu();

    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  test("saves each pick right away and keeps the picker open", () => {
    const { onChange, onClose } = renderMenu();

    fireEvent.click(pickOption("Amanda McKay (EA to CEO)"));
    expect(onChange).toHaveBeenLastCalledWith(["1"]);

    fireEvent.click(pickOption("Brayden Hatch"));
    expect(onChange).toHaveBeenLastCalledWith(["1", "3"]);

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onClose).not.toHaveBeenCalled();
  });

  test("saves a removal right away", () => {
    const { onChange } = renderMenu(["1", "2"]);

    fireEvent.click(screen.getByRole("button", { name: "Remove Amanda McKay" }));

    expect(onChange).toHaveBeenCalledWith(["2"]);
  });

  test("clearing the field unassigns everyone in one write", () => {
    const { onChange } = renderMenu(["1", "2"]);

    fireEvent.click(screen.getByRole("button", { name: "Clear value" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  test("Enter assigns the highlighted person right away", () => {
    const { onChange } = renderMenu();
    const input = screen.getByRole("textbox", { name: "Search people" });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(["1"]);
  });
});
