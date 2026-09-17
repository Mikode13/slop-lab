const FAVORITES_KEY = 'slop-lab:pokemon-favorites';

export function loadFavoriteIds(): number[] {
	const stored = window.localStorage.getItem(FAVORITES_KEY);
	return stored === null ? [] : (JSON.parse(stored) as number[]);
}

export function saveFavoriteIds(ids: number[]): void {
	window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export function toggleFavorite(ids: number[], id: number): number[] {
	const existingIndex = ids.indexOf(id);
	if (existingIndex === -1) {
		return [...ids, id];
	}

	ids.splice(existingIndex, 1);
	return ids;
}
