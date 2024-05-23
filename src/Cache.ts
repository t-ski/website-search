import { freemem } from "os";

import { TToken } from "./types";
import { IQueryResult } from "./interface";

export class Cache {
	private readonly tokens: TToken[] = [];
	private readonly storage: Map<TToken, IQueryResult[]> = new Map();
	private readonly maxSize: number;

	constructor(maxSize: number = Math.round((freemem() / 500) * 0.375)) {
		this.maxSize = maxSize;
	}

	public write(token: TToken, result: IQueryResult[]) {
		this.tokens.push(token);
		this.storage.set(token, result);

		if (this.storage.size <= this.maxSize) return;

		for (let i = 0; i <= Math.round(this.maxSize * 0.25); i++) {
			const delToken: TToken = this.tokens.shift();
			this.storage.delete(delToken);
		} // Invalidate quarter of oldest entries
	}

	public read(token: TToken): IQueryResult[] {
		return this.storage.get(token);
	}

	public contains(token: TToken): boolean {
		return this.storage.has(token);
	}
}
