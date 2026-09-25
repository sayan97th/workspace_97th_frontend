"use client";
import React, { useEffect, useState } from "react";
import FormQuestionField from "@/components/board/form/FormQuestionField";
import type { PublicApiError } from "@/lib/public-api-client";
import { boardFormService } from "@/services/board-form.service";
import type { PublicFormAnswer, PublicFormDto } from "@/types/board-forms";

type PageState = "loading" | "ready" | "submitted" | "unavailable";

/**
 * A board form opened from its public link, filled in by anyone without an
 * account. Each submission becomes a new item on the board.
 */
const PublicFormPage: React.FC<{ token: string }> = ({ token }) => {
  const [form, setForm] = useState<PublicFormDto | null>(null);
  const [page_state, setPageState] = useState<PageState>("loading");
  const [unavailable_message, setUnavailableMessage] = useState("");
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, PublicFormAnswer>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general_error, setGeneralError] = useState<string | null>(null);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [success_message, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    boardFormService
      .getPublicForm(token)
      .then((result) => {
        if (cancelled) return;
        setForm(result);
        setPageState("ready");
        document.title = result.title;
      })
      .catch((error: PublicApiError) => {
        if (cancelled) return;
        setUnavailableMessage(error.message ?? "This form is not available.");
        setPageState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const setAnswer = (column_id: number, value: PublicFormAnswer) => {
    setAnswers((current) => ({ ...current, [column_id]: value }));
    setErrors((current) => {
      const { [`answers.${column_id}`]: _removed, ...rest } = current;
      return rest;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;

    const next_errors: Record<string, string> = {};
    if (!name.trim()) next_errors.name = `${form.name_label} is required.`;
    for (const question of form.questions) {
      const value = answers[question.column_id];
      const is_blank = value === undefined || value === null || value === "" || value === false || (Array.isArray(value) && value.length === 0);
      if (question.is_required && is_blank) next_errors[`answers.${question.column_id}`] = `${question.label} is required.`;
    }
    setErrors(next_errors);
    setGeneralError(null);
    if (Object.keys(next_errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await boardFormService.submitPublicForm(token, name.trim(), answers);
      setSuccessMessage(response.message);
      setPageState("submitted");
    } catch (error) {
      const api_error = error as PublicApiError;
      if (api_error.errors) {
        setErrors(Object.fromEntries(Object.entries(api_error.errors).map(([key, messages]) => [key, messages[0]])));
      } else if (api_error.status_code === 429) {
        setGeneralError("Too many submissions from this network. Please wait a minute and try again.");
      } else {
        setGeneralError(api_error.message ?? "We couldn't send your response. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAnother = () => {
    setName("");
    setAnswers({});
    setErrors({});
    setPageState("ready");
  };

  if (page_state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" role="status" aria-label="Loading form" />
      </div>
    );
  }

  if (page_state === "unavailable" || !form) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-xl font-bold">Form unavailable</h1>
        <p className="text-[14px] text-shell-text-muted">{unavailable_message}</p>
      </main>
    );
  }

  const accent_color = form.accent_color;

  return (
    <main className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-[680px] overflow-hidden rounded-2xl border border-shell-border bg-shell-panel shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
        <div className="h-2" style={{ background: accent_color }} />

        {page_state === "submitted" ? (
          <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full text-[26px] text-white" style={{ background: accent_color }} aria-hidden="true">
              ✓
            </span>
            <h1 className="text-xl font-bold">{form.title}</h1>
            <p className="max-w-md whitespace-pre-line text-[14.5px] text-shell-text-secondary">{success_message}</p>
            <button type="button" onClick={handleSubmitAnother} className="mt-2 text-[13.5px] font-semibold hover:underline" style={{ color: accent_color }}>
              Submit another response
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 px-6 pb-8 pt-7 sm:px-8">
            <header>
              <h1 className="text-[26px] font-bold tracking-[-0.01em]">{form.title}</h1>
              {form.description && <p className="mt-2 whitespace-pre-line text-[14px] text-shell-text-secondary">{form.description}</p>}
            </header>

            <FormQuestionField
              question={{ column_id: 0, type: "text", label: form.name_label, description: null, is_required: true, options: [] }}
              value={name}
              onChange={(value) => {
                setName(typeof value === "string" ? value : "");
                setErrors(({ name: _removed, ...rest }) => rest);
              }}
              error={errors.name}
              accent_color={accent_color}
            />

            {form.questions.map((question) => (
              <FormQuestionField
                key={question.column_id}
                question={question}
                value={answers[question.column_id] ?? null}
                onChange={(value) => setAnswer(question.column_id, value)}
                error={errors[`answers.${question.column_id}`]}
                accent_color={accent_color}
              />
            ))}

            {general_error && (
              <p role="alert" className="rounded-[10px] border border-error-500/30 bg-error-500/10 px-3.5 py-3 text-[13px] text-error-400">
                {general_error}
              </p>
            )}

            <button
              type="submit"
              disabled={is_submitting}
              className="self-start rounded-[10px] px-6 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: accent_color }}
            >
              {is_submitting ? "Sending..." : form.submit_label || "Submit"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
};

export default PublicFormPage;
