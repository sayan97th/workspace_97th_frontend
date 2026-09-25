/** Column types a form question can be built from, see `BoardFormService::SUPPORTED_TYPES` on the API. */
export type BoardFormQuestionType =
  | "text"
  | "long_text"
  | "number"
  | "email"
  | "phone"
  | "link"
  | "date"
  | "timeline"
  | "status"
  | "label"
  | "dropdown"
  | "checkbox"
  | "rating";

export type BoardFormOption = { id: string; label: string; color: string };

/** One saved question: which column it answers, and how the form presents it. */
export type BoardFormQuestionConfig = {
  column_id: number;
  /** Overrides the column's own name on the form, `null` shows the column name. */
  label: string | null;
  description: string | null;
  is_required: boolean;
  is_visible: boolean;
};

export type BoardFormConfig = {
  source_view_id: number | null;
  /** The group new submissions land in, `null` uses the first group of the table. */
  target_group_id: number | null;
  title: string;
  description: string | null;
  /** Label of the question every form asks first, which becomes the item name. */
  name_label: string;
  submit_label: string;
  success_message: string;
  accent_color: string;
  /** Whether the public link accepts responses. */
  is_active: boolean;
  questions: BoardFormQuestionConfig[];
};

export type BoardFormColumn = {
  id: number;
  label: string;
  type: BoardFormQuestionType;
  options: BoardFormOption[];
};

/** `GET /api/boards/{id}/views/{view_id}/form`, everything the builder needs. */
export type BoardFormBuilderDto = {
  view_id: number;
  token: string;
  config: BoardFormConfig;
  columns: BoardFormColumn[];
  groups: { id: number; name: string; color: string }[];
  source_views: { id: number; label: string }[];
};

export type UpdateBoardFormPayload = Partial<Omit<BoardFormConfig, "questions">> & {
  questions?: BoardFormQuestionConfig[];
};

/** One question as the public form renders it. */
export type PublicFormQuestion = {
  column_id: number;
  type: BoardFormQuestionType;
  label: string;
  description: string | null;
  is_required: boolean;
  options: BoardFormOption[];
};

/** `GET /api/public/forms/{token}`. */
export type PublicFormDto = {
  title: string;
  description: string | null;
  name_label: string;
  submit_label: string;
  success_message: string;
  accent_color: string;
  questions: PublicFormQuestion[];
};

/** An answer as the public form sends it, shaped per question type. */
export type PublicFormAnswer = string | number | boolean | string[] | { start: string; end: string } | null;
