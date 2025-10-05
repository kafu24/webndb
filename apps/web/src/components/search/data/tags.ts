export const supportedTags = [
  { name: "Genre", tags: ["Action", "Adventure"] },
  { name: "Theme", tags: ["Theme1", "Theme2"] },
  { name: "Content Rating", tags: ["CR1", "CR2"] },
  { name: "Other", tags: ["Other1", "Other2"] },
] as const;

export type Tag = (typeof supportedTags)[number]["tags"][number];

export type TagState = {
  included: Set<Tag>;
  excluded: Set<Tag>;
};
