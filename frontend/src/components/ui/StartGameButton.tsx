import { LoaderCircle, Play } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type StartGameButtonProps = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled" | "onClick"
> & {
  label: string;
};

export function StartGameButton({
  disabled = false,
  label,
  onClick,
}: StartGameButtonProps) {
  return (
    <div className="group relative">
      <div className="absolute -inset-1 animate-pulse rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 opacity-70 blur-lg transition duration-500 group-hover:opacity-100 group-hover:duration-200 group-has-[:disabled]:opacity-30" />

      <button
        className="relative flex cursor-pointer items-center gap-4 rounded-2xl border border-fuchsia-500/50 bg-black px-10 py-5 text-xl font-extrabold uppercase tracking-wider text-white transition-all duration-300 hover:scale-[1.02] hover:border-fuchsia-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-black shadow-md">
          {disabled ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4 translate-x-px fill-current" />
          )}
        </span>

        <span className="bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent">
          {label}
        </span>
      </button>
    </div>
  );
}
