import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  error?: string;
  prefix?: React.ReactNode | LucideIcon;
  suffix?: React.ReactNode | LucideIcon;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, prefix, suffix, containerClassName, id, ...props }, ref) => {
    const inputId = id || React.useId();

    const renderIcon = (Icon: React.ReactNode | LucideIcon) => {
      if (React.isValidElement(Icon)) {
        return Icon;
      }
      if (typeof Icon === "function" || (Icon && typeof Icon === "object" && "render" in Icon)) {
        const IconComponent = Icon as LucideIcon;
        return <IconComponent size={18} className="text-slate-400" />;
      }
      return Icon;
    };

    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
              {renderIcon(prefix)}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-10 px-3 bg-slate-800/80 text-white text-sm",
              "border border-slate-600 rounded-md",
              "placeholder:text-slate-500",
              "focus:outline-none focus:ring-2 focus:ring-industrial-orange/50 focus:border-industrial-orange",
              "transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              prefix && "pl-10",
              suffix && "pr-10",
              error && "border-red-500 focus:ring-red-500/50 focus:border-red-500",
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
              {renderIcon(suffix)}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-400 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
