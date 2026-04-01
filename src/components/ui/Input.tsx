interface InputProps {
  label: string;
  placeholder?: string;
  type?: string;
  value?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Input({
  label,
  placeholder,
  type = "text",
  value,
  required,
  minLength,
  maxLength,
  onChange,
}: InputProps) {
  return (
    <div>
      <label
        className="block text-xs font-medium mb-1"
        style={{ color: "#6B7B6B" }}
      >
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        onChange={onChange}
        className="w-full pb-2 text-sm bg-transparent outline-none border-b"
        style={{ borderColor: "#D4DDD4", color: "#1A221A" }}
      />
    </div>
  );
}
