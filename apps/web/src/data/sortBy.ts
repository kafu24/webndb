const SUPPORTED_SORT_BY = [
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

type SortBy = (typeof SUPPORTED_SORT_BY)[number];

export { SUPPORTED_SORT_BY, SortBy };
