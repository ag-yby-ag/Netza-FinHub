import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'dark' | 'green';
}

const variantClasses: Record<string, string> = {
  default:
    'bg-white border border-[#E5E5E5] text-[#0D0D0D] hover:border-[#D4D4D4] hover:shadow-md dark:bg-[#141414] dark:border-[rgba(255,255,255,0.06)] dark:text-white dark:hover:border-[rgba(255,255,255,0.12)]',
  dark: 'bg-[#141414] border border-[rgba(255,255,255,0.06)] text-white hover:border-[rgba(255,255,255,0.12)]',
  green: 'bg-[#6DED67] border border-[#6DED67] text-[#0D0D0D]',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-[20px] p-8 transition-all duration-200',
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
