interface EmptyStateProps {
  message: string;
  icon?: string;
}

export function EmptyState({ message, icon = "📭" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm" style={{ color: "#9AA99A" }}>
        {message}
      </p>
    </div>
  );
}
