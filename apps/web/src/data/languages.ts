import { US, JP, KR, CN } from "country-flag-icons/react/3x2";

const SUPPORTED_LANGUAGES = [
  { name: "English", flag: US, code: "en" },
  { name: "Japanese", flag: JP, code: "ja" },
  { name: "Korean", flag: KR, code: "ko" },
  { name: "Simplified Chinese", flag: CN, code: "zh-Hans" },
  { name: "Traditional Chinese", flag: CN, code: "zh-Hant" },
] as const;

type Language = (typeof SUPPORTED_LANGUAGES)[number]["name"];

const CODE_TO_LANGUAGE = {
  "en": "English",
  "ja": "Japanese",
  "ko": "Korean",
  "zh-Hans": "Simplified Chinese",
  "zh-Hant": "Traditional Chinese"
};

const LANGUAGE_TO_CODE_MAP = {
  English: "en",
  Japanese: "ja",
  Korean: "ko",
  "Simplified Chinese": "zh-Hans",
  "Traditional Chinese": "zh-Hant",
};

// Map IETF language tags to ISO 3166-1 alpha-2 codes
const IETFBCP47_TO_ALPHA2_MAP = {
  en: "us",
  ko: "kr",
  "zh-Hans": "cn",
  "zh-Hant": "tw",
  ja: "jp",
};

export {
  SUPPORTED_LANGUAGES,
  type Language,
  CODE_TO_LANGUAGE,
  LANGUAGE_TO_CODE_MAP,
  IETFBCP47_TO_ALPHA2_MAP,
};
