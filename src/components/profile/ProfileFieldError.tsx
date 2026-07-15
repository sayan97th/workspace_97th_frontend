"use client";
import React from "react";
import { AlertCircleIcon } from "@/icons/workspace-icons";

export type ProfileFieldErrorProps = {
  message: string;
};

/** Inline field-level error line, shared by every input in the Personal info / Password cards. */
const ProfileFieldError: React.FC<ProfileFieldErrorProps> = ({ message }) => (
  <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ff8a94]">
    <AlertCircleIcon size={13} className="flex-none" />
    {message}
  </p>
);

export default ProfileFieldError;
