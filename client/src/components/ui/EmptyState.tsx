import React from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import type { ButtonProps } from './Button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps['variant'];
    icon?: LucideIcon;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-16 text-center',
        className,
      )}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F2F2F2] dark:bg-[#1A1A1A]">
        <Icon size={28} className="text-[#A3A3A3]" />
      </div>
      <h3 className="mb-2 font-['Space_Grotesk'] text-lg font-semibold text-[#0D0D0D] dark:text-white">
        {title}
      </h3>
      <p className="mb-6 max-w-sm font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
        {description}
      </p>
      {action && (
        <Button
          variant={action.variant ?? 'primary'}
          icon={action.icon}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
