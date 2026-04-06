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
        className={`w-full pb-2 text-sm bg-transparent outline-none border-b-2 border-[var(--color-g200)] text-[var(--color-text)] placeholder:text-[var(--color-g400)] focus:border-[var(--color-primary)] disabled:opacity-50 transition-colors ${className}`}
      />
    </div>
  );
});
