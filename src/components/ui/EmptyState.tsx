interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-g300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <p className="text-sm text-[var(--color-g400)]">{message}</p>
    </div>
  );
}
