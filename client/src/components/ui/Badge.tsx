import { cn, getStatusColor, getStatusLabel, getRiskColor } from '../../lib/utils';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'green' | 'dark' | 'outline' | 'status' | 'risk';
  status?: string;
  className?: string;
}

export default function Badge({ children, variant = 'green', status, className }: BadgeProps) {
  if (variant === 'status' && status) {
    return (
      <span className={cn('badge-outline text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-pill', getStatusColor(status), className)}>
        {getStatusLabel(status)}
      </span>
    );
  }

  if (variant === 'risk' && status) {
    return (
      <span className={cn('badge-outline text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-pill', getRiskColor(status), className)}>
        {getStatusLabel(status)}
      </span>
    );
  }

  const variantClasses = {
    green: 'badge-green',
    dark: 'badge-dark',
    outline: 'badge-outline text-gray-500 border-gray-300',
  };

  return (
    <span className={cn(variantClasses[variant as keyof typeof variantClasses] || 'badge-green', className)}>
      {children}
    </span>
  );
}
