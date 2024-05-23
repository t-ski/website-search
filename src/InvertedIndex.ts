import { Dirent, readdir, readFileSync, statSync } from "fs";
import { resolve as resolvePath, join } from "path";

import { TDocument, TToken, TTokenIndex } from "./types";
import { IIndexing } from "./interface";
import { OptionReader } from "./OptionReader";
import { Cache } from "./Cache";
import { HTMLTextParser, IParserOptions, ITextNode } from "./HTMLTextParser";

interface IIndexOptions {
	minTokenLength?: number;
	parserOptions?: IParserOptions;
	punctuationChars?: string[];
	relevantFileExtensions?: string[];
}

export class InvertedIndex extends OptionReader<IIndexOptions> {
	private readonly rootPath: string;
	private readonly documentLengths: Map<TDocument, number> = new Map();
	private readonly indexing: { [term: string]: IIndexing } = {};

	public readonly tokenCache = new Cache();
	public readonly resultsCache = new Cache();

	constructor(path: string, options: IIndexOptions = {}) {
		super(
			{
				minTokenLength: 3,
				punctuationChars: [".", ",", ":", ";", "!", "?", '"', "'", "(", ")", "{", "}", "[", "]"],
				relevantFileExtensions: ["html", "htm", "txt"]
			},
			options
		);

		this.options.relevantFileExtensions = this.options.relevantFileExtensions.map((extension: string) =>
			extension.replace(/^\./, "").trim().toLowerCase()
		);

		this.rootPath = resolvePath(path);
	}

	private traversePath(path: string = "./"): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!statSync(join(this.rootPath, path)).isDirectory()) {
				this.indexDocument(path);

				resolve();
				return;
			}

			readdir(
				join(this.rootPath, path),
				{
					withFileTypes: true
				},
				async (err: Error, dirents: Dirent[]) => {
					if (err) {
						reject();
						return;
					}

					for (const dirent of dirents || []) {
						const subPath = join(path, dirent.name);
						dirent.isDirectory() ? await this.traversePath(subPath) : this.indexDocument(subPath);
					}

					resolve();
				}
			);
		});
	}

	private indexDocument(document: TDocument) {
		let scopeIndex: number = 0;
		new HTMLTextParser(this.options.parserOptions)
			.parse(readFileSync(join(this.rootPath, document)).toString())
			.forEach((textNode: ITextNode) => {
				const tokens: string[] = this.tokenize(textNode.content);

				this.documentLengths.set(document, tokens.length);

				tokens.forEach((token: string, tokenIndex: TTokenIndex) => {
					this.indexing[token] = this.indexing[token] ?? {};
					this.indexing[token][document] = (this.indexing[token][document] ?? [])
						.concat([scopeIndex + tokenIndex])
						.flat();
				});

				scopeIndex += tokens.length;
			});
	}

	private levenshteinDistance(token1: TToken, token2: TToken) {
		if (token1 === token2) return 0;
		if (!token1.length || !token2.length) {
			return token1.length + token2.length;
		}

		const row = [];

		let i = 0;
		while (i < token1.length) {
			row[i] = ++i;
		}

		let curDistance, prevDistance, col1, col2;
		let j = 0;
		while (j < token2.length) {
			col2 = token2.charCodeAt(j);

			prevDistance = j;
			curDistance = ++j;

			for (i = 0; i < token1.length; ++i) {
				col1 = prevDistance + (token1.charCodeAt(i) === col2 ? 0 : 1);

				prevDistance = row[i];
				curDistance =
					curDistance < prevDistance
						? curDistance < col1
							? curDistance + 1
							: col1
						: prevDistance < col1
							? prevDistance + 1
							: col1;

				row[i] = curDistance;
			}
		}

		return curDistance;
	}

	public tokenize(text: string): TToken[] {
		return text
			.split(/\s+/g)
			.map((token: string) =>
				token.replace(
					new RegExp(
						`(${this.options.punctuationChars.map((punctuation: string) => `\\${punctuation}`).join("|")})`,
						"g"
					),
					""
				)
			)
			.filter((token: string) => token.length >= this.options.minTokenLength)
			.map((token: string) => token.toLowerCase());
	}

	public async index(): Promise<this> {
		await this.traversePath();

		return this;
	}

	public indexedTokens(preciseToken: TToken, maxLevenshteinDistance: number = 0): TToken[] {
		return Object.keys(this.indexing)
			.map(
				(
					token: TToken
				): {
					token: TToken;
					distance: number;
				} => {
					return {
						token,
						distance: this.levenshteinDistance(token, preciseToken)
					};
				}
			)
			.sort((a, b) => a.distance - b.distance)
			.filter((entry) => entry.distance <= maxLevenshteinDistance)
			.map((entry) => entry.token); // Ordered by proximity (integral steps)
	}

	public tokenIndexing(token: TToken): IIndexing {
		return this.indexing[token] ?? {};
	}

	public documentLength(document: TDocument): number {
		return this.documentLengths.get(document);
	}

	public documentAmount(): number {
		return this.documentLengths.size;
	}

	public toString(): string {
		return `Index ${JSON.stringify(this.indexing, null, 2)}`;
	}
}
