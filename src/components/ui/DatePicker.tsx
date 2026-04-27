"use client";

import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from "date-fns/locale";

interface DatePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  inputClassName?: string;
  wrapperClassName?: string;
  maxDate?: Date;
}

export function DatePicker({
  label,
  value,
  onChange,
  inputClassName,
  wrapperClassName = "w-full",
  maxDate = new Date(),
}: DatePickerProps) {
  const selected = value ? new Date(value) : new Date();

  function handleChange(date: Date | null) {
    if (!date) return;
    const kst = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    onChange(kst.toISOString().slice(0, 10));
  }

  const defaultInputClassName =
    "w-full pb-2 text-sm bg-transparent border-b border-[var(--color-g200)] dark:border-[var(--color-border)] outline-none text-[var(--color-text)] dark:text-[var(--color-text)] cursor-pointer";

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium mb-1 text-(--color-g500) dark:text-(--color-muted)">
          {label}
        </label>
      )}
      <ReactDatePicker
        selected={selected}
        onChange={handleChange}
        locale={ko}
        dateFormat="yyyy.MM.dd"
        maxDate={maxDate}
        className={inputClassName ?? defaultInputClassName}
        wrapperClassName={wrapperClassName}
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
          padding: 4px;
        }
        .investlog-calendar .react-datepicker__header {
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-g100);
          padding: 12px 4px 8px;
        }
        .investlog-calendar .react-datepicker__current-month {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 8px;
        }
        .investlog-calendar .react-datepicker__day-names {
          display: flex;
          justify-content: space-around;
          margin: 0;
        }
        .investlog-calendar .react-datepicker__week {
          display: flex;
          justify-content: space-around;
        }
        .investlog-calendar .react-datepicker__day-name,
        .investlog-calendar .react-datepicker__day {
          width: 2rem;
          height: 2rem;
          line-height: 2rem;
          margin: 2px 0;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          box-sizing: border-box;
        }
        .investlog-calendar .react-datepicker__day-name {
          color: var(--color-g400);
          font-size: 11px;
          font-weight: 600;
        }
        .investlog-calendar .react-datepicker__day {
          color: var(--color-text);
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
          border-radius: 50% !important;
        }
        .investlog-calendar .react-datepicker__day--today:not(.react-datepicker__day--selected) {
          font-weight: 700;
          color: var(--color-primary);
        }
        .investlog-calendar .react-datepicker__day--disabled {
          color: var(--color-g300);
        }
        .investlog-calendar .react-datepicker__day--outside-month {
          color: var(--color-g300);
        }
        .investlog-calendar .react-datepicker__navigation-icon::before {
          border-color: var(--color-g400);
        }
        .investlog-calendar .react-datepicker__triangle {
          display: none;
        }
        .investlog-calendar .react-datepicker__month {
          margin: 4px 0 0;
        }
      `}</style>
    </div>
  );
}
