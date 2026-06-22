import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  footer?: React.ReactNode;
  hoverable?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  footer,
  hoverable = false,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "w-full bg-slate-800/80 border border-slate-700 rounded-lg overflow-hidden",
        "transition-all duration-300",
        hoverable &&
          "cursor-pointer hover:border-industrial-orange/50 hover:shadow-lg hover:shadow-industrial-orange/10 hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {title && (
        <div className="px-5 py-4 border-b border-slate-700">
          {typeof title === "string" ? (
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          ) : (
            title
          )}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-slate-700 bg-slate-800/50">
          {footer}
        </div>
      )}
    </div>
  );
};

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({ className, children, ...props }) => {
  return (
    <h3
      className={cn("text-lg font-semibold text-white", className)}
      {...props}
    >
      {children}
    </h3>
  );
};

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ className, children, ...props }) => {
  return (
    <div className={cn("px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
};

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn("px-5 py-3 border-t border-slate-700 bg-slate-800/50", className)}
      {...props}
    >
      {children}
    </div>
  );
};
