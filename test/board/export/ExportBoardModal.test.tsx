import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExportBoardModal from "@/components/board/export/ExportBoardModal";
import type { BoardExportJobDto, BoardExportSummary } from "@/types/board-export";

const toast_mock = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock("@/components/ui/toast/ToastProvider", () => ({ useToast: () => toast_mock }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/echo", () => ({ getEcho: vi.fn() }));

const service = vi.hoisted(() => ({
  getSummary: vi.fn(),
  start: vi.fn(),
  getStatus: vi.fn(),
  cancel: vi.fn(),
  download: vi.fn(),
}));
vi.mock("@/services/board-export.service", () => ({ boardExportService: service }));

const summary: BoardExportSummary = {
  board_label: "Launch Plan",
  view_label: "Main table",
  group_name: null,
  groups: 3,
  items: 1250,
  subitems: 40,
  columns: 12,
  subitem_columns: 4,
  hidden_columns: 2,
};

const makeJob = (overrides: Partial<BoardExportJobDto> = {}): BoardExportJobDto => ({
  id: 7,
  board_id: 1,
  group_id: null,
  status: "processing",
  layout: "grouped",
  include_subitems: true,
  include_hidden_columns: true,
  file_name: "launch_plan_2026-11-10.xlsx",
  file_size_bytes: 52_000,
  total_rows: 1290,
  processed_rows: 500,
  column_count: 13,
  percent: 39,
  cancel_requested: false,
  error_message: null,
  download_url: null,
  created_at: null,
  started_at: null,
  finished_at: null,
  expires_at: null,
  ...overrides,
});

const renderModal = (props: Partial<Parameters<typeof ExportBoardModal>[0]> = {}) =>
  render(<ExportBoardModal is_open onClose={vi.fn()} board_id={1} board_label="Launch Plan" view_id={5} {...props} />);

describe("ExportBoardModal", () => {
  beforeEach(() => {
    window.localStorage.clear();
    service.getSummary.mockResolvedValue(summary);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("shows what will be exported and the hidden columns switch", async () => {
    renderModal();

    expect(await screen.findByText("1,250")).toBeInTheDocument();
    expect(screen.getByText("Items")).toBeInTheDocument();
    expect(screen.getByText("2 columns are hidden in this view")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Like the board/ })).toHaveAttribute("aria-checked", "true");
    expect(service.getSummary).toHaveBeenCalledWith(1, 5, null);
  });

  test("starts the export with the chosen layout and switches", async () => {
    service.start.mockResolvedValue(makeJob());
    renderModal();
    const user = userEvent.setup();

    await screen.findByText("1,250");
    await user.click(screen.getByRole("radio", { name: /Single table/ }));
    await user.click(screen.getByRole("switch", { name: "Include subitems" }));
    await user.click(screen.getByRole("button", { name: "Export" }));

    expect(service.start).toHaveBeenCalledWith(1, expect.objectContaining({ view_id: 5, group_id: null, layout: "flat", include_subitems: false, include_hidden_columns: true }));
    expect(await screen.findByText("39%")).toBeInTheDocument();
    expect(screen.getByText("Writing 500 of 1,290 rows")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("board-export-preferences") ?? "{}")).toMatchObject({ layout: "flat", include_subitems: false });
  });

  test("downloads the file on its own once the export is ready", async () => {
    const ready = makeJob({ status: "completed", processed_rows: 1290, percent: 100, download_url: "/api/board-exports/7/download?signature=x" });
    service.start.mockResolvedValue(ready);
    service.download.mockReturnValue(true);
    renderModal();
    const user = userEvent.setup();

    await screen.findByText("1,250");
    await user.click(screen.getByRole("button", { name: "Export" }));

    expect(await screen.findByText("Your file is ready")).toBeInTheDocument();
    expect(screen.getByText("launch_plan_2026-11-10.xlsx")).toBeInTheDocument();
    await waitFor(() => expect(service.download).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "Download again" }));
    expect(service.download).toHaveBeenCalledTimes(2);
  });

  test("shows why the export could not start", async () => {
    service.start.mockRejectedValue(new Error("You already have 3 exports running."));
    renderModal();
    const user = userEvent.setup();

    await screen.findByText("1,250");
    await user.click(screen.getByRole("button", { name: "Export" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  test("scopes the export to a group from the group menu", async () => {
    renderModal({ group: { id: 9, name: "Design" } });

    await screen.findByText("1,250");
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(service.getSummary).toHaveBeenCalledWith(1, 5, 9);
  });
});
