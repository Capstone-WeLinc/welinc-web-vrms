import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          let bgColor = 'bg-slate-900/90 border-slate-700/50';
          let icon = <Info className="w-5 h-5 text-brand-gold flex-shrink-0" />;

          if (toast.type === 'success') {
            bgColor = 'bg-emerald-950/90 border-emerald-500/30';
            icon = <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
          } else if (toast.type === 'error') {
            bgColor = 'bg-rose-950/90 border-rose-500/30';
            icon = <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />;
          } else if (toast.type === 'info') {
            bgColor = 'bg-amber-950/90 border-brand-gold/30';
            icon = <Info className="w-5 h-5 text-brand-gold flex-shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3.5 p-4 border rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 animate-slide-in pointer-events-auto ${bgColor}`}
            >
              {icon}
              <div className="flex-1 text-sm font-medium leading-snug text-white/90">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-white/30 hover:text-white/60 transition-colors p-0.5 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
