import { atom, type PreinitializedWritableAtom } from "nanostores";
import { type Language } from "@/components/search/data/languages";
import { type Tag, type TagState } from "@/components/search/data/tags";
import { type Status } from "@/components/search/data/statuses";
import { type MinMaxState } from "@/components/search/data/minMax";
import { type SortBy } from "@/components/search/data/sortBy";

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

type ReleaseDates = {
  oldest?: Date;
  latest?: Date;
};
export const $selectedReleaseDates = atom<ReleaseDates>({
  oldest: undefined,
  latest: undefined,
});

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

export const updateOldestDate = (date: Date | undefined): boolean => {
  const releaseDates = $selectedReleaseDates.get();

  if (date && releaseDates.latest && date > releaseDates.latest) return false;

  $selectedReleaseDates.set({
    ...releaseDates,
    oldest: date,
  });
  return true;
};
export const updateLatestDate = (date: Date | undefined): boolean => {
  const releaseDates = $selectedReleaseDates.get();

  if (date && releaseDates.oldest && date < releaseDates.oldest) return false;

  $selectedReleaseDates.set({
    ...releaseDates,
    latest: date,
  });
  return true;
};


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
  $selectedReleaseDates.set({
    oldest: undefined,
    latest: undefined,
  });
}
