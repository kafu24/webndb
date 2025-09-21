import { persistentAtom } from "@nanostores/persistent";
import { atom } from "nanostores";

export type Theme = "light" | "dark" | "system" | "custom";

// TODO: add more themes and custom theme support

const $theme = persistentAtom<Theme>("theme", "system", {
  encode: JSON.stringify,
  decode: JSON.parse,
});

const $appliedTheme = atom<"light" | "dark" | "custom">("light");

export const themeManager = {
  getTheme() {
    return $theme.get();
  },

  setTheme(theme: Theme) {
    $theme.set(theme);
    this.applyTheme(theme);
  },

  applyTheme(theme: Theme) {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    let appliedTheme: "light" | "dark" | "custom";

    if (theme === "system") {
      appliedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else {
      appliedTheme = theme;
    }

    root.setAttribute("data-theme", appliedTheme);
    root.classList.toggle("dark", appliedTheme === "dark");
    $appliedTheme.set(appliedTheme);
  },

  initTheme() {
    if (typeof window === "undefined") return;

    const currentTheme = $theme.get();
    this.applyTheme(currentTheme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", () => {
      if ($theme.get() === "system") {
        this.applyTheme("system");
      }
    });
  },
};
