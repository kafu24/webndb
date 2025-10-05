import { atom, type PreinitializedWritableAtom } from "nanostores";
import { type Language } from "@/components/search/language/languages.ts";
import { type Tag, type TagState } from "@/components/search/tag/tags.ts";
import { type Status } from "@/components/search/status/statuses";
import { type MinMaxState } from "@/components/search/minMax/minMax";
import { type SortBy } from "@/components/search/sortBy/sortBy";

export const $selectedOriginalLanguages = atom<Language[]>([]);
export const $selectedAvailableLanguages = atom<Language[]>([]);

export const $selectedPublishers = atom<string[]>([]);
export const $selectedStaff = atom<string[]>([]);

export const $selectedTags = atom<TagState>({
  included: new Set(),
  excluded: new Set(),
});

export const $selectedStatuses = atom<Status[]>([]);

export const $selectedMinMax = atom<MinMaxState>({
  Chapters: { type: "min", value: 0 },
  Readers: { type: "min", value: 0 },
  Rating: { type: "min", value: 0 },
  "# Ratings": { type: "min", value: 0 },
  Reviews: { type: "min", value: 0 },
});

export const $selectedSortBy = atom<SortBy>("Latest Update");

export const filterMap = {
  Original: $selectedOriginalLanguages,
  Available: $selectedAvailableLanguages,
  Publishers: $selectedPublishers,
  Staff: $selectedStaff,
};

export function addToAtom(
  atom: PreinitializedWritableAtom<string[]>,
  item: string,
) {
  const current = atom.get();
  if (!current.includes(item)) {
    atom.set([...current, item]);
  }
}

export function removeFromAtom(
  atom: PreinitializedWritableAtom<string[]>,
  item: string,
) {
  const current = atom.get();
  atom.set(current.filter((i) => i !== item));
}

export function updateTagState(tag: Tag) {
  const current = $selectedTags.get();
  const included = new Set(current.included);
  const excluded = new Set(current.excluded);
  if (included.has(tag)) {
    included.delete(tag);
    excluded.add(tag);
  } else if (excluded.has(tag)) {
    excluded.delete(tag);
  } else {
    included.add(tag);
  }
  $selectedTags.set({ included: included, excluded: excluded });
}

export function toggleMinMax(type: keyof MinMaxState) {
  const current = $selectedMinMax.get();
  const currentValue = current[type];
  $selectedMinMax.set({
    ...current,
    [type]: {
      ...currentValue,
      type: currentValue.type === "min" ? "max" : "min",
    },
  });
}

export function resetAllFilters() {
  Object.values(filterMap).forEach((atom) => atom.set([]));
  $selectedTags.set({ included: new Set(), excluded: new Set() });
  $selectedMinMax.set({
    Chapters: { type: "min", value: 0 },
    Readers: { type: "min", value: 0 },
    Rating: { type: "min", value: 0 },
    "# Ratings": { type: "min", value: 0 },
    Reviews: { type: "min", value: 0 },
  });
  $selectedSortBy.set("Latest Update");
}
