"use client";
import React from "react";
import type { BoardFormOption, BoardFormQuestionType, PublicFormAnswer } from "@/types/board-forms";

export type FormQuestionFieldQuestion = {
  column_id: number;
  type: BoardFormQuestionType;
  label: string;
  description: string | null;
  is_required: boolean;
  options: BoardFormOption[];
};

export type FormQuestionFieldProps = {
  question: FormQuestionFieldQuestion;
  value: PublicFormAnswer;
  onChange: (value: PublicFormAnswer) => void;
  error?: string | null;
  accent_color: string;
  /** Renders the field inert, for the builder's live preview. */
  is_preview?: boolean;
};

const INPUT_CLASS =
  "w-full rounded-[10px] border border-shell-border-strong bg-shell-bg px-3.5 py-2.5 text-[14px] text-shell-text outline-none transition-colors placeholder:text-shell-text-faint focus:border-[var(--form-accent)] disabled:cursor-default";

const PLACEHOLDERS: Partial<Record<BoardFormQuestionType, string>> = {
  text: "Your answer",
  long_text: "Your answer",
  number: "0",
  email: "name@example.com",
  phone: "+1 555 000 0000",
  link: "https://",
};

const asString = (value: PublicFormAnswer): string => (typeof value === "string" || typeof value === "number" ? String(value) : "");

/**
 * One question of a board form, rendered per column type. Shared by the
 * public form and the builder's live preview so both always look the same.
 */
const FormQuestionField: React.FC<FormQuestionFieldProps> = ({ question, value, onChange, error, accent_color, is_preview = false }) => {
  const field_id = `form-question-${question.column_id}`;
  const described_by = question.description ? `${field_id}-description` : undefined;

  const renderControl = () => {
    switch (question.type) {
      case "long_text":
        return (
          <textarea
            id={field_id}
            rows={4}
            value={asString(value)}
            onChange={(event) => onChange(event.target.value)}
            placeholder={PLACEHOLDERS.long_text}
            disabled={is_preview}
            maxLength={10000}
            aria-describedby={described_by}
            className={`${INPUT_CLASS} resize-y`}
          />
        );

      case "status":
      case "label":
        return (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${field_id}-label`}>
            {question.options.map((option) => {
              const is_selected = value === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={is_selected}
                  disabled={is_preview}
                  onClick={() => onChange(is_selected ? null : option.id)}
                  className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-white transition-[opacity,box-shadow] disabled:cursor-default"
                  style={{
                    background: option.color,
                    opacity: value && !is_selected ? 0.45 : 1,
                    boxShadow: is_selected ? `0 0 0 2px var(--color-shell-panel), 0 0 0 4px ${option.color}` : undefined,
                  }}
                >
                  {option.label || "Blank"}
                </button>
              );
            })}
          </div>
        );

      case "dropdown": {
        const selected = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${field_id}-label`}>
            {question.options.map((option) => {
              const is_selected = selected.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="checkbox"
                  aria-checked={is_selected}
                  disabled={is_preview}
                  onClick={() => onChange(is_selected ? selected.filter((id) => id !== option.id) : [...selected, option.id])}
                  className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors disabled:cursor-default ${
                    is_selected ? "border-transparent text-white" : "border-shell-border-strong text-shell-text hover:bg-shell-hover"
                  }`}
                  style={is_selected ? { background: accent_color } : undefined}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        );
      }

      case "checkbox":
        return (
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-[14px] text-shell-text">
            <input
              id={field_id}
              type="checkbox"
              checked={value === true}
              disabled={is_preview}
              onChange={(event) => onChange(event.target.checked)}
              className="h-4 w-4"
              style={{ accentColor: accent_color }}
            />
            Yes
          </label>
        );

      case "rating": {
        const rating = typeof value === "number" ? value : 0;
        return (
          <div className="flex gap-1" role="radiogroup" aria-labelledby={`${field_id}-label`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
                disabled={is_preview}
                onClick={() => onChange(rating === star ? null : star)}
                className="text-[26px] leading-none transition-transform hover:scale-110 disabled:cursor-default disabled:hover:scale-100"
                style={{ color: star <= rating ? "#fdab3d" : "var(--color-shell-border-strong)" }}
              >
                ★
              </button>
            ))}
          </div>
        );
      }

      case "date":
        return (
          <input
            id={field_id}
            type="date"
            value={asString(value)}
            onChange={(event) => onChange(event.target.value || null)}
            disabled={is_preview}
            aria-describedby={described_by}
            className={`${INPUT_CLASS} max-w-[220px]`}
          />
        );

      case "timeline": {
        const range = value && typeof value === "object" && !Array.isArray(value) ? value : { start: "", end: "" };
        return (
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={field_id}
              type="date"
              aria-label={`${question.label} start`}
              value={range.start}
              max={range.end || undefined}
              onChange={(event) => onChange({ start: event.target.value, end: range.end })}
              disabled={is_preview}
              className={`${INPUT_CLASS} max-w-[200px]`}
            />
            <span className="text-[13px] text-shell-text-muted">to</span>
            <input
              type="date"
              aria-label={`${question.label} end`}
              value={range.end}
              min={range.start || undefined}
              onChange={(event) => onChange({ start: range.start, end: event.target.value })}
              disabled={is_preview}
              className={`${INPUT_CLASS} max-w-[200px]`}
            />
          </div>
        );
      }

      default:
        return (
          <input
            id={field_id}
            type={question.type === "number" ? "number" : question.type === "email" ? "email" : question.type === "phone" ? "tel" : question.type === "link" ? "url" : "text"}
            value={asString(value)}
            onChange={(event) => onChange(event.target.value)}
            placeholder={PLACEHOLDERS[question.type]}
            disabled={is_preview}
            maxLength={question.type === "text" ? 2000 : undefined}
            aria-describedby={described_by}
            className={INPUT_CLASS}
          />
        );
    }
  };

  return (
    <div className="flex flex-col gap-2" style={{ "--form-accent": accent_color } as React.CSSProperties}>
      <label id={`${field_id}-label`} htmlFor={field_id} className="text-[14.5px] font-semibold text-shell-text">
        {question.label}
        {question.is_required && <span className="ml-1 text-error-400" aria-hidden="true">*</span>}
      </label>
      {question.description && (
        <p id={`${field_id}-description`} className="-mt-1 text-[12.5px] text-shell-text-muted">
          {question.description}
        </p>
      )}
      {renderControl()}
      {error && (
        <p role="alert" className="text-[12.5px] text-error-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormQuestionField;
