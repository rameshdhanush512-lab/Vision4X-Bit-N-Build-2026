import { cn } from '../../utils';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: Props) {
  return (
    <div className={cn('bg-surface-card border border-surface-border rounded-xl p-5', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: Props) {
  return <div className={cn('mb-4', className)}>{children}</div>;
}

export function CardTitle({ children, className }: Props) {
  return <h3 className={cn('text-sm font-semibold text-gray-200 uppercase tracking-wider', className)}>{children}</h3>;
}
