import { atom, type PreinitializedWritableAtom } from "nanostores";
import { type Language} from "@/components/search/language/languages.ts"

export const $selectedOriginalLanguages = atom<Language[]>([]);
export const $selectedAvailableLanguages = atom<Language[]>([]);
export const $selectedPublishers = atom<string[]>([]);
export const $selectedStaff = atom<string[]>([]);

export const filterMap = {
  "Original": $selectedOriginalLanguages,
  "Available": $selectedAvailableLanguages,
  "Publishers": $selectedPublishers,
  "Staff": $selectedStaff,
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
