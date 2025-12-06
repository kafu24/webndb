const SUPPORTED_MIN_MAX = [
  "Chapters",
  "Readers",
  "Rating",
  "# Ratings",
  "Reviews",
] as const;

type MinMaxState = {
  [K in (typeof SUPPORTED_MIN_MAX)[number]]: {
    type: "min" | "max";
    value: number;
  };
};

export { SUPPORTED_MIN_MAX, MinMaxState };
