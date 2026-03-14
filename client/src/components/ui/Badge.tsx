import React from 'react';
import clsx from 'clsx';

type BadgeVariant = 'green' | 'dark' | 'outline';
type StatusVariant = 'active' | 'pending' | 'blocked' | 'inactive';
type RiskVariant = 'low' | 'medium' | 'high';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  status?: StatusVariant;
  risk?: RiskVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-[#E8FDE7] text-[#4BA846]',
  dark: 'bg-[#0D0D0D] text-white',
  outline: 'bg-transparent border-[1.5px] border-current',
};

const statusClasses: Record<StatusVariant, string> = {
  active: 'bg-[#E8FDE7] text-[#4BA846]',
  pending: 'bg-[#FEF9C3] text-[#A16207]',
  blocked: 'bg-[#FEE2E2] text-[#DC2626]',
  inactive: 'bg-[#F2F2F2] text-[#737373] dark:bg-[#262626] dark:text-[#A3A3A3]',
};

const riskClasses: Record<RiskVariant, string> = {
  low: 'bg-transparent border-[1.5px] border-[#4BA846] text-[#4BA846]',
  medium: 'bg-transparent border-[1.5px] border-[#A16207] text-[#A16207]',
  high: 'bg-transparent border-[1.5px] border-[#DC2626] text-[#DC2626]',
};

const statusLabels: Record<StatusVariant, string> = {
  active: 'Ativo',
  pending: 'Pendente',
  blocked: 'Bloqueado',
  inactive: 'Inativo',
};

const riskLabels: Record<RiskVariant, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
};

export const Badge: React.FC<BadgeProps> = ({
  variant,
  status,
  risk,
  className,
  children,
  ...props
}) => {
  let classes = '';
  let defaultLabel = '';

  if (status) {
    classes = statusClasses[status];
    defaultLabel = statusLabels[status];
  } else if (risk) {
    classes = riskClasses[risk];
    defaultLabel = riskLabels[risk];
  } else {
    classes = variantClasses[variant ?? 'green'];
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold font-["Plus_Jakarta_Sans"] leading-5',
        classes,
        className,
      )}
      {...props}
    >
      {children ?? defaultLabel}
    </span>
  );
};
