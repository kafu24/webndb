import { atom, type PreinitializedWritableAtom } from "nanostores";

export const $selectedOriginalLanguages = atom<string[]>([]);
export const $selectedAvailableLanguages = atom<string[]>([]);
export const $selectedPublishers = atom<string[]>([]);
export const $selectedStaff = atom<string[]>([]);

export const filterMap = {
  "Original Languages": $selectedOriginalLanguages,
  "Available Languages": $selectedAvailableLanguages,
  Publishers: $selectedPublishers,
  Staff: $selectedStaff,
};

export function addToAtom(atom: PreinitializedWritableAtom<string[]>, item: string) {
  const current = atom.get();
  if (!current.includes(item)) {
    atom.set([...current, item]);
  }
}

export function removeFromAtom(atom: PreinitializedWritableAtom<string[]>, item: string) {
  const current = atom.get();
  atom.set(current.filter((i) => i !== item));
}

export function resetAllFilters() {
  Object.values(filterMap).forEach((atom) => atom.set([]));
}
