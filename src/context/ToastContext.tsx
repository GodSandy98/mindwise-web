import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Toast {
  id: number;
  message: string;
  linkTo?: string;
  linkLabel?: string;
}

interface ToastContextValue {
  showToast: (message: string, linkTo?: string, linkLabel?: string) => void;
}

const ToastContext = createContext<ToastContextValue>(null!);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, linkTo?: string, linkLabel?: string) => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, message, linkTo, linkLabel }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — top-right, above everything */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-xs animate-slide-in"
          >
            <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="flex-1">{t.message}</span>
            {t.linkTo && t.linkLabel && (
              <Link
                to={t.linkTo}
                className="text-indigo-300 hover:text-indigo-100 font-medium underline whitespace-nowrap"
              >
                {t.linkLabel}
              </Link>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
