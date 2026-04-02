interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl p-5 bg-white dark:bg-[#1D2720] ${className}`}
      style={{
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      {children}
    </div>
  );
}
