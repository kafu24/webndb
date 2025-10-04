import { atom } from "nanostores";

export const $selectedPublishers = atom<string[]>([]);
export const $selectedStaff = atom<string[]>([]);

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

export function addStaff(staff: string) {
  const current = $selectedStaff.get();
  if (!current.includes(staff)) {
    $selectedStaff.set([...current, staff]);
  }
}

export function removeStaff(staff: string) {
  const current = $selectedStaff.get();
  $selectedStaff.set(current.filter((t) => t !== staff));
}

export function resetFilters() {
  $selectedPublishers.set([]);
  $selectedStaff.set([]);
}
