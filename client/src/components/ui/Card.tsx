import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'white' | 'dark' | 'green';
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className, variant = 'white', hover, onClick }: CardProps) {
  const variants = {
    white: 'bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10',
    dark: 'bg-dark-card border border-white/10',
    green: 'bg-brand border border-brand',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-card transition-all duration-200',
        variants[variant],
        hover && 'hover:shadow-md cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
