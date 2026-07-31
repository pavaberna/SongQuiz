import type { ReactNode, SelectHTMLAttributes } from "react";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
  id: string;
  label: string;
};

export function Select({
  children,
  className = "",
  id,
  label,
  ...selectProps
}: SelectProps) {
  const classes = [
    "h-11 w-full cursor-pointer rounded-control border border-border bg-surface px-3 text-foreground outline-none transition-colors",
    "focus:border-primary focus:ring-2 focus:ring-primary/20",
    "disabled:cursor-not-allowed disabled:opacity-50",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label
      className="flex min-w-40 flex-col gap-2 text-sm font-medium text-muted"
      htmlFor={id}
    >
      <span>{label}</span>

      <select className={classes} id={id} {...selectProps}>
        {children}
      </select>
    </label>
  );
}
