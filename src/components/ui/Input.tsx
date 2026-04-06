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
        <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">
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
        className={`w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] placeholder:text-[#B4C4B4] dark:placeholder:text-[#4A5A4A] focus:border-[#05C072] disabled:opacity-50 transition-colors ${className}`}
      />
    </div>
  );
});
