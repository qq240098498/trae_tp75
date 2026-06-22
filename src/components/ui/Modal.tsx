import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  title?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeStyles: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  onClose,
  children,
  footer,
  className,
  contentClassName,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  size = "md",
}) => {
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeOnEsc, onClose, open]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/70 backdrop-blur-sm",
        "animate-in fade-in duration-200",
        className
      )}
    >
      <div
        className={cn(
          "relative w-full mx-4 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl",
          "animate-in zoom-in-95 duration-200",
          sizeStyles[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className={cn("px-6 py-4", !title && "pt-6", contentClassName)}>
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
