import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
  onChange?: (value: string | number) => void;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, placeholder, error, options, onChange, containerClassName, id, value, ...props }, ref) => {
    const selectId = id || React.useId();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      const option = options.find((opt) => String(opt.value) === val);
      if (onChange && option) {
        onChange(option.value);
      }
    };

    const selectedValue = value !== undefined ? String(value) : "";

    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-slate-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            value={selectedValue}
            onChange={handleChange}
            className={cn(
              "w-full h-10 px-3 pr-10 bg-slate-800/80 text-white text-sm appearance-none",
              "border border-slate-600 rounded-md cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-industrial-orange/50 focus:border-industrial-orange",
              "transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              !selectedValue && "text-slate-500",
              error && "border-red-500 focus:ring-red-500/50 focus:border-red-500",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="bg-slate-800 text-white"
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-400 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
