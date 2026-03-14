import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const icons: Record<ToastType, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const typeClasses: Record<ToastType, string> = {
  success: 'border-l-[#6DED67]',
  error: 'border-l-[#DC2626]',
  warning: 'border-l-[#F59E0B]',
  info: 'border-l-[#3B82F6]',
};

const iconColors: Record<ToastType, string> = {
  success: 'text-[#6DED67]',
  error: 'text-[#DC2626]',
  warning: 'text-[#F59E0B]',
  info: 'text-[#3B82F6]',
};

let counter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, title: string, description?: string) => {
      const id = `toast-${++counter}`;
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed right-4 top-4 z-[9999] flex flex-col gap-2"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const Icon = icons[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 80 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                role="alert"
                className={clsx(
                  'flex w-80 items-start gap-3 rounded-xl border border-[#E5E5E5] border-l-4 bg-white p-4 shadow-lg dark:border-[#262626] dark:bg-[#141414]',
                  typeClasses[t.type],
                )}
              >
                <Icon size={18} className={clsx('mt-0.5 shrink-0', iconColors[t.type])} />
                <div className="min-w-0 flex-1">
                  <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] dark:text-white">
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-[#737373] dark:text-[#A3A3A3]">
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 rounded-md p-0.5 text-[#A3A3A3] transition-colors hover:text-[#0D0D0D] dark:hover:text-white"
                  aria-label="Fechar notificação"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
