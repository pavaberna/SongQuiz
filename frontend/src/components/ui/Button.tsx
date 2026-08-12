import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg" | "icon";
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fullWidth?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const baseClasses =
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control border font-bold transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-14 px-7 text-lg",
  icon: "h-11 w-11 p-0",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white shadow-[0_0_24px_rgba(217,70,239,0.35)] hover:border-cyan-300 hover:shadow-[0_0_32px_rgba(6,182,212,0.45)] hover:scale-[1.02] active:scale-[0.98]",
  secondary:
    "border-cyan-400/50 bg-cyan-500/15 text-cyan-100 shadow-[0_0_18px_rgba(6,182,212,0.22)] hover:border-cyan-300 hover:bg-cyan-400/20",
  ghost:
    "border-neutral-800 bg-neutral-950/70 text-neutral-200 hover:border-fuchsia-400/50 hover:bg-fuchsia-950/30 hover:text-white",
};

export function Button({
  children,
  className = "",
  fullWidth = false,
  size = "md",
  type = "button",
  variant = "primary",
  ...buttonProps
}: ButtonProps) {
  const classes = [
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type={type} {...buttonProps}>
      {children}
    </button>
  );
}
