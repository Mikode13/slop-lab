export interface Paginated<T> {
	count: number;
	next: string;
	previous: string;
	results: T[];
}
