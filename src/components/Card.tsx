interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className = "", interactive = false, style }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 ${
        interactive ? "transition-shadow hover:shadow-md" : ""
      } ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
