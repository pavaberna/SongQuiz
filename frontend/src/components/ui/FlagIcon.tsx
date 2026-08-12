import gbFlag from "../../assets/flags/gb.svg";
import huFlag from "../../assets/flags/hu.svg";

export type FlagCountry = "gb" | "hu";

type FlagIconProps = {
  country: FlagCountry;
};

const flagByCountry: Record<FlagCountry, string> = {
  gb: gbFlag,
  hu: huFlag,
};

export function FlagIcon({ country }: FlagIconProps) {
  return (
    <img
      alt=""
      className="h-4 w-6 shrink-0 rounded-sm object-cover shadow-sm"
      src={flagByCountry[country]}
    />
  );
}
