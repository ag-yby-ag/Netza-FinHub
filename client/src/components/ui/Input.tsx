import React from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, iconPosition = 'left', className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && iconPosition === 'left' && (
            <Icon
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
            />
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full rounded-xl border bg-white px-4 py-2.5 font-["Plus_Jakarta_Sans"] text-sm text-[#0D0D0D] outline-none transition-colors duration-200',
              'placeholder:text-[#A3A3A3]',
              'focus:border-[#6DED67] focus:ring-2 focus:ring-[#6DED67]/20',
              'dark:bg-[#1A1A1A] dark:text-white dark:border-[#262626] dark:focus:border-[#6DED67]',
              error
                ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20'
                : 'border-[#E5E5E5]',
              Icon && iconPosition === 'left' && 'pl-10',
              Icon && iconPosition === 'right' && 'pr-10',
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
          {Icon && iconPosition === 'right' && (
            <Icon
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
            />
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="font-['Plus_Jakarta_Sans'] text-xs text-[#DC2626]"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
