import React from "react";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "destructiveSolid";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  iconOnly?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "secondary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      iconOnly = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed select-none rounded-sm";

    const variantClasses = {
      primary:
        "bg-[#09090B] text-white hover:bg-stone-800 active:bg-stone-900 border border-stone-800 shadow-2xs disabled:bg-surface-raised disabled:text-txt-disabled disabled:border-transparent",
      secondary:
        "bg-surface border border-border-default text-txt-primary hover:border-border-strong hover:bg-hover active:bg-pressed disabled:text-txt-disabled disabled:border-border-subtle",
      ghost:
        "bg-transparent text-txt-secondary hover:bg-hover hover:text-txt-primary active:bg-pressed disabled:text-txt-disabled",
      destructive:
        "bg-transparent border border-danger-border text-danger-text hover:bg-danger-subtle active:bg-danger-pressed-bg disabled:text-txt-disabled disabled:border-border-subtle",
      destructiveSolid:
        "bg-danger text-white hover:bg-danger-hover active:bg-danger-active disabled:bg-surface-raised disabled:text-txt-disabled",
    };

    const sizeClasses = {
      sm: iconOnly ? "h-7 w-7 text-xs p-0" : "h-7 px-2.5 text-xs gap-1.5",
      md: iconOnly ? "h-8 w-8 text-xs p-0" : "h-8 px-3 text-xs gap-1.5",
      lg: iconOnly ? "h-10 w-10 text-sm p-0" : "h-10 px-4 text-sm gap-2",
    };

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={clsx(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        ) : (
          <>
            {icon && iconPosition === "left" && <span className="flex-shrink-0">{icon}</span>}
            {children}
            {icon && iconPosition === "right" && <span className="flex-shrink-0">{icon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
