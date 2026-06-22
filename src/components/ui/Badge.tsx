import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-slate-700 text-slate-300 border border-slate-600",
  success:
    "bg-emerald-900/40 text-emerald-400 border border-emerald-600/50",
  warning:
    "bg-industrial-orange/20 text-industrial-orange-light border border-industrial-orange/50",
  danger:
    "bg-red-900/40 text-red-400 border border-red-600/50",
  info:
    "bg-primary-900/40 text-primary-400 border border-primary-600/50",
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
