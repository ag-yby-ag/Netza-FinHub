import React from 'react';
import clsx from 'clsx';

export interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rect' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
}

const Bone: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className,
  style,
}) => (
  <div
    className={clsx(
      'animate-pulse rounded-lg bg-[#F2F2F2] dark:bg-[#262626]',
      className,
    )}
    style={style}
  />
);

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  count = 1,
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  const style: React.CSSProperties = {
    width: width ?? undefined,
    height: height ?? undefined,
  };

  return (
    <div className={clsx('flex flex-col gap-3', className)}>
      {items.map((i) => {
        switch (variant) {
          case 'circle':
            return (
              <Bone
                key={i}
                className="shrink-0 rounded-full"
                style={{ width: width ?? 40, height: height ?? 40 }}
              />
            );
          case 'rect':
            return <Bone key={i} style={{ ...style, height: height ?? 120 }} />;
          case 'card':
            return (
              <div key={i} className="rounded-[20px] border border-[#E5E5E5] p-8 dark:border-[#262626]">
                <Bone className="mb-4 h-8 w-1/3" />
                <Bone className="mb-2 h-4 w-full" />
                <Bone className="h-4 w-2/3" />
              </div>
            );
          default:
            return <Bone key={i} className="h-4" style={{ width: width ?? '100%' }} />;
        }
      })}
    </div>
  );
};
