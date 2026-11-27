import React from "react";
import type { RecentBoardPreview } from "@/types/personal";
import { cssVars } from "./previewHelpers";

/** Questions the card has room for. */
const QUESTION_LIMIT = 3;

/** How a question's answer box looks, from the column kind behind it. */
const answerStyleOf = (type: string): "choice" | "date" | "check" | "text" => {
  if (["status", "label", "dropdown", "tags", "people"].includes(type)) return "choice";
  if (["date", "timeline"].includes(type)) return "date";
  if (type === "checkbox") return "check";
  return "text";
};

/**
 * A mini Form: the form's real title over a bar in its accent color, its
 * first questions with answer boxes shaped by their column kind, and the
 * submit button.
 */
const FormPreview: React.FC<{ preview: RecentBoardPreview; fallback_title: string }> = ({ preview, fallback_title }) => {
  const form = preview.form;
  const questions = form?.questions.length ? form.questions.slice(0, QUESTION_LIMIT) : [{ label: "Name", type: "text" }];

  return (
    <div className="vp-form" style={cssVars({ "--vp-accent": form?.accent_color ?? "#6161ff" })}>
      <div className="vp-form__card">
        <p className="vp-form__title">{form?.title || fallback_title}</p>
        {questions.map((question, index) => (
          <span key={index} className="vp-form__question">
            <span className="vp-form__label">{question.label}</span>
            <span className="vp-form__answer" data-style={answerStyleOf(question.type)} />
          </span>
        ))}
        <span className="vp-form__submit">Submit</span>
      </div>
    </div>
  );
};

export default FormPreview;
