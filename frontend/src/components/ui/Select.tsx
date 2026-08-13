import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

export type SelectOption = {
  icon?: ReactNode;
  label: string;
  value: string;
};

export type SelectProps = {
  compactOnMobile?: boolean;
  disabled?: boolean;
  id: string;
  label?: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  value: string;
};

export function Select({
  compactOnMobile = false,
  disabled = false,
  id,
  label,
  onValueChange,
  options,
  value,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  function selectOption(optionValue: string) {
    onValueChange(optionValue);
    setIsOpen(false);
  }

  return (
    <div
      className="relative flex min-w-0 flex-col gap-2 text-sm font-semibold text-muted"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      {label && <label htmlFor={id}>{label}</label>}

      <button
        className={`flex h-11 w-full cursor-pointer items-center justify-between rounded-full border border-neutral-800 bg-neutral-950/80 text-foreground shadow-inner transition-colors focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20 disabled:cursor-not-allowed disabled:opacity-50 ${
          compactOnMobile ? "gap-0 px-3 sm:gap-3 sm:px-4" : "gap-3 px-4"
        }`}
        disabled={disabled}
        id={id}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedOption?.icon}
          <span className={compactOnMobile ? "hidden truncate sm:inline" : "truncate"}>
            {selectedOption?.label}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${compactOnMobile ? "hidden sm:block" : ""} ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full z-20 mt-2 min-w-40 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 p-1 shadow-2xl ${
            compactOnMobile ? "right-0 sm:left-0" : "left-0 right-0"
          }`}
        >
          {options.map((option) => (
            <button
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-foreground transition-colors hover:bg-fuchsia-500/15 focus:bg-fuchsia-500/15 focus:outline-none"
              key={option.value}
              onClick={() => selectOption(option.value)}
              type="button"
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
