import React from 'react';
import clsx from 'clsx';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
}) => {
  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={clsx(
        'relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200',
        checked ? 'bg-[#6DED67]' : 'bg-[#E5E5E5] dark:bg-[#404040]',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={clsx(
          'inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[21px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  );

  if (!label) return toggle;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] dark:text-white">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-[#A3A3A3]">
            {description}
          </p>
        )}
      </div>
      {toggle}
    </div>
  );
};
