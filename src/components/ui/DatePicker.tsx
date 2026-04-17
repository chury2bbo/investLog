"use client";

import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from "date-fns/locale";

interface DatePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
}

export function DatePicker({ label, value, onChange }: DatePickerProps) {
  const selected = value ? new Date(value) : new Date();

  function handleChange(date: Date | null) {
    if (!date) return;
    const kst = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    onChange(kst.toISOString().slice(0, 10));
  }

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium mb-1 text-[var(--color-g500)] dark:text-[var(--color-muted)]">
          {label}
        </label>
      )}
      <ReactDatePicker
        selected={selected}
        onChange={handleChange}
        locale={ko}
        dateFormat="yyyy.MM.dd"
        maxDate={new Date()}
        className="w-full pb-2 text-sm bg-transparent border-b border-[var(--color-g200)] dark:border-[var(--color-border)] outline-none text-[var(--color-text)] dark:text-[var(--color-text)] cursor-pointer"
        wrapperClassName="w-full"
        calendarClassName="investlog-calendar"
        popperPlacement="bottom-start"
        portalId="datepicker-portal"
        popperProps={{ strategy: "fixed" }}
      />
      <style>{`
        .react-datepicker-popper {
          z-index: 9999 !important;
        }
        .investlog-calendar {
          font-family: inherit;
          border: 1px solid var(--color-g200);
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.12);
          overflow: hidden;
          background: var(--color-surface);
          color: var(--color-text);
        }
        .investlog-calendar .react-datepicker__header {
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-g100);
          padding-top: 14px;
        }
        .investlog-calendar .react-datepicker__current-month {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text);
        }
        .investlog-calendar .react-datepicker__day-name {
          color: var(--color-g400);
          font-size: 11px;
          font-weight: 600;
        }
        .investlog-calendar .react-datepicker__day {
          color: var(--color-text);
          border-radius: 8px;
          font-size: 13px;
        }
        .investlog-calendar .react-datepicker__day:hover {
          background: var(--color-g100);
          border-radius: 8px;
        }
        .investlog-calendar .react-datepicker__day--selected {
          background: var(--color-primary) !important;
          color: #fff !important;
          font-weight: 700;
        }
        .investlog-calendar .react-datepicker__day--today {
          font-weight: 700;
          color: var(--color-primary);
        }
        .investlog-calendar .react-datepicker__day--disabled {
          color: var(--color-g300);
        }
        .investlog-calendar .react-datepicker__navigation-icon::before {
          border-color: var(--color-g400);
        }
        .investlog-calendar .react-datepicker__triangle {
          display: none;
        }
      `}</style>
    </div>
  );
}
