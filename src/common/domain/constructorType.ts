type NonFunctionPropertyNames<T> = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	[K in keyof T]-?: NonNullable<T[K]> extends Function ? never : K;
}[keyof T];

export type ConstructorType<T> = Pick<T, NonFunctionPropertyNames<T>>;
