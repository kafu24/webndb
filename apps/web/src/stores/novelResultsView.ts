import { persistentAtom } from '@nanostores/persistent';

export type ViewType = 'compact' | 'card' | 'grid'
export const $novelResultsView = persistentAtom<ViewType>('novelResultsView', 'card');
