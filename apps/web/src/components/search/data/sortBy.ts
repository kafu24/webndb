export const supportedSortBy = [
  "Latest Update",
  "Oldest Update",
  "Latest Added",
  "Oldest Added",
  "Title Ascending",
  "Title Descending",
  "Most Chapters",
  "Least Chapters",
  "Most Readers",
  "Least Readers",
  "Highest Rating",
  "Lowest Rating",
  "Most # Ratings",
  "Least # Ratings",
  "Most Reviews",
  "Least Reviews",
] as const;

export type SortBy = (typeof supportedSortBy)[number];
