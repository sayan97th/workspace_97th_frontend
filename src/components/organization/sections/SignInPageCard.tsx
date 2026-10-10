"use client";
import React from "react";
import { LogIn } from "lucide-react";
import { Field, OrganizationCard, input_class, textarea_class } from "../organization-fields";
import { FIELD_MAX_LENGTHS } from "../organization-form";
import type { OrganizationSectionProps } from "./section-props";

/** Welcome copy on the sign in, sign up and invitation pages, next to the organization logo. */
const SignInPageCard: React.FC<OrganizationSectionProps> = ({ draft, field_errors, setField }) => (
  <OrganizationCard
    id="sign_in"
    icon={LogIn}
    title="Sign in page"
    description="The welcome panel people see before they sign in. It also shows your logo and brand color."
  >
    <div className="grid gap-5">
      <Field
        label="Headline"
        is_optional
        hint="Leave empty to keep the default headline."
        error={field_errors.login_headline}
        counter={{ length: draft.login_headline.length, max: FIELD_MAX_LENGTHS.login_headline ?? 120 }}
      >
        {(input_props) => (
          <input
            {...input_props}
            type="text"
            value={draft.login_headline}
            onChange={(event) => setField("login_headline", event.target.value)}
            maxLength={FIELD_MAX_LENGTHS.login_headline}
            className={input_class}
            placeholder="The workspace that keeps your team's content, sprints and clients in sync."
          />
        )}
      </Field>
      <Field
        label="Welcome message"
        is_optional
        error={field_errors.login_message}
        counter={{ length: draft.login_message.length, max: FIELD_MAX_LENGTHS.login_message ?? 280 }}
      >
        {(input_props) => (
          <textarea
            {...input_props}
            rows={2}
            value={draft.login_message}
            onChange={(event) => setField("login_message", event.target.value)}
            maxLength={FIELD_MAX_LENGTHS.login_message}
            className={textarea_class}
            placeholder="Use your company email to sign in. Need access? Ask your workspace admin."
          />
        )}
      </Field>
    </div>
  </OrganizationCard>
);

export default SignInPageCard;
