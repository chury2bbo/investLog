interface SectionTitleProps {
  title: string;
  action?: React.ReactNode;
}

export function SectionTitle({ title, action }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-bold text-[var(--color-text)]">
        {title}
      </h2>
      {action}
    </div>
  );
}
