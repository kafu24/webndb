import { IconHome } from "@tabler/icons-react";

export const supportedLanguages = [
  { name: "English", flag: IconHome },
  { name: "Chinese", flag: IconHome },
  { name: "Korean", flag: IconHome },
  { name: "Japanese", flag: IconHome },
  { name: "test", flag: IconHome },
] as const;

export type Language = (typeof supportedLanguages)[number]["name"];
