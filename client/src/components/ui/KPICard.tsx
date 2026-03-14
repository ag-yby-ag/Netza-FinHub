import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { motion, useInView } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from './Card';

export interface KPICardProps {
  value: number;
  formattedValue?: string;
  label: string;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'neutral';
  className?: string;
}

function useCountUp(target: number, duration: number = 1200, shouldStart: boolean = false) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;

    let start = 0;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(eased * target);
      setCurrent(value);
      if (progress < 1) {
        start = requestAnimationFrame(animate);
      }
    }

    start = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(start);
  }, [target, duration, shouldStart]);

  return current;
}

export const KPICard: React.FC<KPICardProps> = ({
  value,
  formattedValue,
  label,
  trend,
  trendDirection = 'neutral',
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const animatedValue = useCountUp(value, 1200, isInView);

  const isPositive = trendDirection === 'up';
  const isNegative = trendDirection === 'down';

  return (
    <Card className={clsx('relative overflow-hidden', className)} ref={ref}>
      <div className="flex flex-col gap-3">
        <p className="font-['Space_Grotesk'] text-[40px] font-bold leading-tight text-[#6DED67]">
          {formattedValue
            ? formattedValue.replace(String(value), String(animatedValue))
            : animatedValue.toLocaleString('pt-BR')}
        </p>
        <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
          {label}
        </p>
      </div>

      {trend !== undefined && trendDirection !== 'neutral' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
          className={clsx(
            'mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
            isPositive && 'bg-[#E8FDE7] text-[#4BA846]',
            isNegative && 'bg-[#FEE2E2] text-[#DC2626]',
          )}
        >
          {isPositive && <TrendingUp size={12} />}
          {isNegative && <TrendingDown size={12} />}
          {trend > 0 ? '+' : ''}
          {trend}%
        </motion.div>
      )}
    </Card>
  );
};
