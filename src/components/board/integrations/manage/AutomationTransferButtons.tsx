"use client";
import React, { useRef, useState } from "react";
import { FileDown, FileUp } from "lucide-react";
import type { BoardAutomationImportResult } from "@/types/board-automation";
import { boardAutomationService } from "@/services/board-automation.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { ICON_BUTTON } from "./manageUi";

export type AutomationTransferButtonsProps = {
  board_id: number;
  view_id: number | null;
  board_label: string;
  /** The automations "Export" writes, every automation of the table when empty. */
  automation_ids: number[];
  /** Hides Export, for a table without automations. */
  can_export: boolean;
  onImported: (result: BoardAutomationImportResult) => Promise<void> | void;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
};

/** Largest file the browser reads before sending it, the API caps what it accepts too. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const fileSlug = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "board";

/** Saves `data` as a pretty printed JSON file. */
function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * "Export" and "Import" of the Manage tab: automations as a JSON file another table (of this
 * board or another one) can import. Columns, labels and groups are matched by name on import,
 * and every imported automation starts turned off.
 */
export default function AutomationTransferButtons({ board_id, view_id, board_label, automation_ids, can_export, onImported, onError, onNotice }: AutomationTransferButtonsProps) {
  const input_ref = useRef<HTMLInputElement | null>(null);
  const [is_busy, setIsBusy] = useState(false);

  const exportFile = async () => {
    setIsBusy(true);
    try {
      const file = await boardAutomationService.exportAutomations(board_id, view_id, automation_ids);
      downloadJson(`automations-${fileSlug(board_label)}.json`, file);
      onNotice(`Exported ${file.automations.length} automation(s). Import the file on any table to copy them there.`);
    } catch (failure) {
      onError(apiErrorMessage(failure, "The automations could not be exported."));
    } finally {
      setIsBusy(false);
    }
  };

  const importFile = async (picked: File) => {
    if (picked.size > MAX_FILE_BYTES) {
      onError("The file is too large to be an automations export.");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(await picked.text());
    } catch {
      onError("The file is not valid JSON. Choose a file exported from the Manage tab.");
      return;
    }

    setIsBusy(true);
    try {
      const result = await boardAutomationService.importAutomations(board_id, view_id, parsed);
      await onImported(result);
    } catch (failure) {
      onError(apiErrorMessage(failure, "The automations could not be imported. Choose a file exported from the Manage tab."));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      {can_export && (
        <button type="button" onClick={() => void exportFile()} disabled={is_busy} aria-label={automation_ids.length ? "Export the selected automations as a file" : "Export every automation as a file"} title={automation_ids.length ? "Export selected (JSON)" : "Export all (JSON)"} className={ICON_BUTTON}>
          <FileDown size={16} />
        </button>
      )}
      <button type="button" onClick={() => input_ref.current?.click()} disabled={is_busy} aria-label="Import automations from a file" title="Import (JSON)" className={ICON_BUTTON}>
        <FileUp size={16} />
      </button>
      <input
        ref={input_ref}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const picked = event.target.files?.[0];
          event.target.value = "";
          if (picked) void importFile(picked);
        }}
      />
    </>
  );
}
