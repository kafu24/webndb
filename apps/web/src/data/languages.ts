import { US, JP, KR, CN } from "country-flag-icons/react/3x2";

const SUPPORTED_LANGUAGES = [
  { name: "English", flag: US },
  { name: "Japanese", flag: JP },
  { name: "Korean", flag: KR },
  { name: "Chinese", flag: CN },
] as const;

type Language = (typeof SUPPORTED_LANGUAGES)[number]["name"];

export { SUPPORTED_LANGUAGES, Language };
