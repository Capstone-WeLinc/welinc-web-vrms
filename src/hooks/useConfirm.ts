import { useState } from 'react';

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  type?: 'default' | 'danger' | 'warning';
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'default',
  });

  const triggerConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    type?: 'default' | 'danger' | 'warning';
  }) => {
    setConfirmState({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      onConfirm: () => {
        options.onConfirm();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
      type: options.type || 'default',
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  return { confirmState, triggerConfirm, closeConfirm };
}
