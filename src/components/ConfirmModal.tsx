import React from 'react';
import { HelpCircle, AlertCircle, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'default' | 'danger' | 'warning';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'default',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  let icon = <HelpCircle className="w-8 h-8 text-amber-500 animate-bounce" />;
  let iconBg = 'bg-amber-500/10 border-amber-500/30';
  let confirmBtnBg = 'bg-brand-warning hover:bg-brand-warning-dark text-brand-primary';

  if (type === 'danger') {
    icon = <AlertCircle className="w-8 h-8 text-red-500" />;
    iconBg = 'bg-red-500/10 border-red-500/30 text-red-500';
    confirmBtnBg = 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/15';
  } else if (type === 'warning') {
    icon = <AlertTriangle className="w-8 h-8 text-amber-500" />;
    iconBg = 'bg-amber-500/10 border-amber-500/30 text-amber-500';
    confirmBtnBg = 'bg-amber-500 hover:bg-amber-600 text-white';
  }

  return (
    <div className="fixed inset-0 bg-brand-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-[999999]">
      <div className="bg-brand-dark border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden animate-fade-in">
        {/* Glow */}
        <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="flex gap-4">
          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1 tracking-tight">{title}</h3>
            <p className="text-white/60 text-sm leading-relaxed mb-6">{message}</p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 border border-white/10 text-white/70 hover:text-white rounded-xl text-xs font-semibold hover:bg-white/5 transition-all cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${confirmBtnBg}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
