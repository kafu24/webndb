import { atom } from "nanostores";

export const $selectedAuthors = atom<string[]>([]);
export const $selectedPublishers = atom<string[]>([]);
export const $selectedTranslators = atom<string[]>([]);

export function addAuthor(author: string) {
  const current = $selectedAuthors.get();
  if (!current.includes(author)) {
    $selectedAuthors.set([...current, author]);
  }
}

export function removeAuthor(author: string) {
  const current = $selectedAuthors.get();
  $selectedAuthors.set(current.filter((a) => a !== author));
}

export function addPublisher(publisher: string) {
  const current = $selectedPublishers.get();
  if (!current.includes(publisher)) {
    $selectedPublishers.set([...current, publisher]);
  }
}

export function removePublisher(publisher: string) {
  const current = $selectedPublishers.get();
  $selectedPublishers.set(current.filter((p) => p !== publisher));
}

export function addTranslator(translator: string) {
  const current = $selectedTranslators.get();
  if (!current.includes(translator)) {
    $selectedTranslators.set([...current, translator]);
  }
}

export function removeTranslator(translator: string) {
  const current = $selectedTranslators.get();
  $selectedTranslators.set(current.filter((t) => t !== translator));
}

// Reset all
export function resetFilters() {
  $selectedAuthors.set([]);
  $selectedPublishers.set([]);
  $selectedTranslators.set([]);
}
