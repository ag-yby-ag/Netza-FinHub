import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-[#6DED67] text-[#0D0D0D] font-semibold hover:bg-[#5CCB56] hover:shadow-[0_4px_20px_rgba(109,237,103,0.3)] active:bg-[#4BA846]',
  secondary:
    'bg-transparent border-2 border-[#0D0D0D] text-[#0D0D0D] font-semibold hover:bg-[#0D0D0D] hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-[#0D0D0D]',
  ghost:
    'bg-transparent text-[#525252] hover:text-[#4BA846] dark:text-[#A3A3A3] dark:hover:text-[#6DED67]',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-4 py-1.5 text-xs gap-1.5',
  md: 'px-6 py-2.5 text-sm gap-2',
  lg: 'px-8 py-3.5 text-base gap-2.5',
};

const iconSizes: Record<string, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon: Icon,
      iconPosition = 'left',
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const iSize = iconSizes[size];

    return (
      <motion.button
        ref={ref}
        whileHover={isDisabled ? undefined : { y: -1 }}
        whileTap={isDisabled ? undefined : { scale: 0.97 }}
        className={clsx(
          'inline-flex items-center justify-center rounded-full font-["Plus_Jakarta_Sans"] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6DED67] focus-visible:ring-offset-2',
          variantClasses[variant],
          sizeClasses[size],
          isDisabled && 'pointer-events-none opacity-50',
          className,
        )}
        disabled={isDisabled}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        {loading && <Loader2 size={iSize} className="animate-spin" />}
        {!loading && Icon && iconPosition === 'left' && <Icon size={iSize} />}
        {children}
        {!loading && Icon && iconPosition === 'right' && <Icon size={iSize} />}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
