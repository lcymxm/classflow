import { useEffect } from "react";
import { AlertTriangle, Check, Info, X } from "lucide-react";

export type ToastTone = "success" | "info" | "error";

export interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastProps {
  toast: ToastState | null;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;
  const Icon = toast.tone === "error" ? AlertTriangle : toast.tone === "info" ? Info : Check;

  return (
    <div className={`toast toast--${toast.tone}`} role="status" aria-live="polite">
      <span className="toast-icon">
        <Icon size={14} strokeWidth={2} />
      </span>
      <span>{toast.message}</span>
      <button className="toast-close" type="button" onClick={onClose} aria-label="关闭提示">
        <X size={13} />
      </button>
    </div>
  );
}
