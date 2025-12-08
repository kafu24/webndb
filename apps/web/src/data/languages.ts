import { US, JP, KR, CN } from "country-flag-icons/react/3x2";

const SUPPORTED_LANGUAGES = [
  { name: "English", flag: US, code: "en" },
  { name: "Japanese", flag: JP, code: "ja" },
  { name: "Korean", flag: KR, code: "ko" },
  { name: "Simplified Chinese", flag: CN, code: "zh-Hans" },
  { name: "Traditional Chinese", flag: CN, code: "zh-Hant" },
] as const;

type Language = (typeof SUPPORTED_LANGUAGES)[number]["name"];

export { SUPPORTED_LANGUAGES, Language };
