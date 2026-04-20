interface Tab<T extends string> {
  key: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (key: T) => void;
  variant?: "segment" | "chip";
  className?: string;
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  variant = "segment",
  className = "",
}: TabsProps<T>) {
  if (variant === "segment") {
    return (
      <div className={`flex gap-1 p-1 rounded-2xl bg-(--color-g100) dark:bg-(--color-border) ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex-1 py-2 rounded-xl text-sm transition-all cursor-pointer ${
              active === tab.key
                ? "bg-(--color-primary-soft) dark:bg-[rgba(45,184,122,0.15)] text-(--color-primary) font-bold border-[1.5px] border-(--color-primary)"
                : "bg-transparent text-(--color-g500) font-medium border-[1.5px] border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex gap-1.5 overflow-x-auto scrollbar-hide ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            active === tab.key
              ? "bg-(--color-primary-soft) dark:bg-[rgba(45,184,122,0.15)] text-(--color-primary) border-[1.5px] border-(--color-primary)"
              : "bg-transparent text-(--color-g500) border border-(--color-g200)"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
