export abstract class OptionReader<I> {
	protected readonly options: I;

	constructor(defaultOptions: I, options: I) {
		this.options = {
			...defaultOptions,
			...options
		};
	}
}
