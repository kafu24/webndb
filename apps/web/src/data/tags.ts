const SUPPORTED_TAGS = [
  { name: "Genre", tags: ["Action", "Adventure"] },
  { name: "Theme", tags: ["Theme1", "Theme2"] },
  { name: "Content Rating", tags: ["CR1", "CR2"] },
  { name: "Other", tags: ["Other1", "Other2"] },
] as const;

type Tag = (typeof SUPPORTED_TAGS)[number]["tags"][number];

type TagState = {
  included: Set<Tag>;
  excluded: Set<Tag>;
};

export { SUPPORTED_TAGS, Tag, TagState };
