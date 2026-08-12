import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

export type SelectOption = {
  icon?: ReactNode;
  label: string;
  value: string;
};

export type SelectProps = {
  disabled?: boolean;
  id: string;
  label?: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  value: string;
};

export function Select({
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
      className="relative flex min-w-40 flex-col gap-2 text-sm font-semibold text-muted"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      {label && <label htmlFor={id}>{label}</label>}

      <button
        className="flex h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-full border border-neutral-800 bg-neutral-950/80 px-4 text-foreground shadow-inner transition-colors focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        id={id}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedOption?.icon}
          <span className="truncate">{selectedOption?.label}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 p-1 shadow-2xl">
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
