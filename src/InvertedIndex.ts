import { Dirent, readdir, readFileSync, statSync } from "fs";
import { resolve as resolvePath, join } from "path";
import { HTMLTextParser, IParserOptions, ITextNode } from "./HTMLTextParser";
import { OptionReader } from "./OptionReader";

type TDocument = string;

interface IIndexOptions {
	minTokenLength?: number;
	parserOptions?: IParserOptions;
	punctuationChars?: string[];
	relevantFileExtensions?: string[];
}

interface IIndexing {
	[document: TDocument]: number; // freq(document)
}

export type TRanking = {
	document: TDocument;
	score: number;
}[];

export class InvertedIndex extends OptionReader<IIndexOptions> {
	private readonly rootPath: string;
	private readonly documentLength: Map<TDocument, number> = new Map();
	private readonly indexing: { [term: string]: IIndexing } = {};

	constructor(path: string, options: IIndexOptions = {}) {
		super(
			{
				minTokenLength: 3,
				punctuationChars: [".", ",", ":", ";", "!", "?", '"', "'"],
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
		new HTMLTextParser(this.options.parserOptions)
			.parse(readFileSync(join(this.rootPath, document)).toString())
			.forEach((textNode: ITextNode) => {
				const tokens: string[] = this.tokenize(textNode.content);

				this.documentLength.set(document, tokens.length);

				tokens.forEach((token: string) => {
					this.indexing[token] = this.indexing[token] ?? {};
					this.indexing[token][document] = (this.indexing[token][document] ?? 0) + 1;
				});
			});
	}

	private tokenize(text: string): string[] {
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

	public query(token: string, max: number): TRanking;
	public query(tokens: string[], max: number): TRanking;
	public query(arg: string | string[], max: number = 5): TRanking {
		const tokens: string[] = [arg].flat();

		const ranking: TRanking = [];

		const idf = Math.log(Object.keys(this.indexing[tokens[0]] ?? {}).length / this.documentLength.size + 1);

		for (const document in this.indexing[tokens[0]]) {
			const tf =
				Math.log2(1 + ((this.indexing[tokens[0]] ?? {})[document] ?? 0)) /
				Math.log2(Math.max(2, this.documentLength.get(document)));

			ranking.push({
				document,
				score: tf * idf
			});
		}

		return ranking.sort((a, b) => b.score - a.score).slice(0, max);
	}

	// TODO: Similarity sort for neighbouring search

	public toString(): string {
		return `Index ${JSON.stringify(this.indexing, null, 2)}`;
	}
}
