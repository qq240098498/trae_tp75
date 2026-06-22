import * as React from "react";
import { createPortal } from "react-dom";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

const toastStyles: Record<ToastType, { bg: string; border: string; icon: React.ElementType; iconColor: string }> = {
  success: {
    bg: "bg-emerald-900/40",
    border: "border-emerald-600",
    icon: CheckCircle,
    iconColor: "text-emerald-400",
  },
  error: {
    bg: "bg-red-900/40",
    border: "border-red-600",
    icon: XCircle,
    iconColor: "text-red-400",
  },
  warning: {
    bg: "bg-industrial-orange/20",
    border: "border-industrial-orange",
    icon: AlertTriangle,
    iconColor: "text-industrial-orange-light",
  },
  info: {
    bg: "bg-primary-900/40",
    border: "border-primary-600",
    icon: Info,
    iconColor: "text-primary-400",
  },
};

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const { id, type, message, duration = 3000 } = toast;
  const [isVisible, setIsVisible] = React.useState(true);
  const [isExiting, setIsExiting] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose(id);
    }, 300);
  };

  if (!isVisible) return null;

  const style = toastStyles[type];
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 min-w-[320px] max-w-md px-4 py-3 rounded-lg shadow-lg",
        "border backdrop-blur-sm",
        style.bg,
        style.border,
        isExiting ? "animate-out slide-out-to-right duration-300" : "animate-in slide-in-from-right duration-300"
      )}
    >
      <Icon size={20} className={cn("flex-shrink-0", style.iconColor)} />
      <p className="flex-1 text-sm text-white font-medium">{message}</p>
      <button
        onClick={handleClose}
        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors flex-shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export interface ToastContextType {
  toasts: ToastItem[];
  showToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = React.useCallback((type: ToastType, message: string, duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const value = React.useMemo<ToastContextType>(
    () => ({
      toasts,
      showToast,
      removeToast,
      success: (message, duration) => showToast("success", message, duration),
      error: (message, duration) => showToast("error", message, duration),
      warning: (message, duration) => showToast("warning", message, duration),
      info: (message, duration) => showToast("info", message, duration),
    }),
    [toasts, showToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
            {toasts.map((toast) => (
              <Toast key={toast.id} toast={toast} onClose={removeToast} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};
