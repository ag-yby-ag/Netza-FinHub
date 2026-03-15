import { cn } from '../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
}

export default function Toggle({ checked, onChange, label, size = 'md' }: ToggleProps) {
  const trackSize = size === 'sm' ? 'w-8 h-[18px]' : 'w-10 h-[22px]';
  const knobSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-[18px] h-[18px]';
  const translate = size === 'sm' ? 'translate-x-[18px]' : 'translate-x-[20px]';

  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative rounded-pill transition-colors duration-200',
          trackSize,
          checked ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform duration-200',
            knobSize,
            checked && translate
          )}
        />
      </button>
      {label && <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>}
    </label>
  );
}
