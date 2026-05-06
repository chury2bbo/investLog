"use client";

import { forwardRef } from "react";

interface InputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  disabled?: boolean;
  inputMode?: "text" | "numeric" | "decimal" | "email" | "tel" | "search" | "url" | "none";
  className?: string;
  tooltip?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    placeholder,
    type = "text",
    value,
    required,
    minLength,
    maxLength,
    disabled,
    inputMode,
    className = "",
    tooltip,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
  },
  ref,
) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium mb-1 text-[var(--color-g500)]">
          {label}
        </label>
      )}
      <div className={tooltip ? "relative group" : "relative"}>
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          disabled={disabled}
          inputMode={inputMode}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className={`w-full pb-2 text-sm bg-transparent outline-none border-b-2 border-[var(--color-g200)] text-[var(--color-text)] placeholder:text-[var(--color-g400)] focus:border-[var(--color-primary)] disabled:opacity-50 transition-colors [&::-webkit-calendar-picker-indicator]:cursor-pointer ${className}`}
        />
        {tooltip && (
          <span
            className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
            style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)", backgroundColor: "var(--color-tooltip)" }}
          >
            {tooltip}
            <span className="absolute top-full right-3 w-0 h-0" style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid var(--color-tooltip)" }} />
          </span>
        )}
      </div>
    </div>
  );
});
