import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "warning";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-700 text-white hover:bg-primary-600 border border-primary-600 focus:ring-2 focus:ring-primary-500/50",
  secondary:
    "bg-transparent text-primary-400 border-2 border-primary-600 hover:bg-primary-600/20 hover:border-primary-500 focus:ring-2 focus:ring-primary-500/30",
  danger:
    "bg-red-600 text-white hover:bg-red-500 border border-red-500 focus:ring-2 focus:ring-red-500/50",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500 focus:ring-2 focus:ring-emerald-500/50",
  warning:
    "bg-industrial-orange text-white hover:bg-industrial-orange-light border border-industrial-orange focus:ring-2 focus:ring-industrial-orange/50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading = false, disabled = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold rounded-md transition-all duration-200",
          "focus:outline-none focus:ring-offset-2 focus:ring-offset-slate-900",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none",
          "active:scale-[0.98]",
          variantStyles[variant],
          sizeStyles[size],
          loading && "cursor-wait",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" size={size === "sm" ? 14 : size === "md" ? 16 : 18} />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
