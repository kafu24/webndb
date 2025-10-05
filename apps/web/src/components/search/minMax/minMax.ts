export const supportedMinMax = [
  "Chapters",
  "Readers",
  "Rating",
  "# Ratings",
  "Reviews",
] as const;

export type MinMaxState = {
  [K in (typeof supportedMinMax)[number]]: {
    type: "min" | "max";
    value: number;
  };
};
