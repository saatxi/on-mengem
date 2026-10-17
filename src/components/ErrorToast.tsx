import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  message: string | null;
  onClose: () => void;
}

export const ErrorToast: React.FC<Props> = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 max-w-[calc(100vw-2rem)] rounded-xl bg-red-600 text-white px-4 py-3 text-sm font-medium shadow-xl"
    >
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 p-0.5 rounded hover:bg-red-700 transition" aria-label="Tanca">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
