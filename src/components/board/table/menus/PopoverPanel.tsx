"use client";

import type { CSSProperties, ReactNode } from "react";
import { useOutsideClick } from "../useOutsideClick";

interface PopoverPanelProps {
  onClose: () => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export default function PopoverPanel({ onClose, className, style, children }: PopoverPanelProps) {
  const panel_ref = useOutsideClick<HTMLDivElement>(true, onClose);
  return (
    <div
      ref={panel_ref}
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-[70] rounded-[10px] border border-[#e3e6ef] bg-white text-left shadow-[0_16px_40px_rgba(30,34,55,0.20)] ${className || ""}`}
      style={style}
    >
      {children}
    </div>
  );
}
