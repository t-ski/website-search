import { performance } from "perf_hooks";

import { TToken, TTokenIndex } from "./types";
import { IIndexing, IQueryResult } from "./interface";
import { OptionReader } from "./OptionReader";
import { InvertedIndex } from "./InvertedIndex";

interface IQueryOptions {
	maxResults?: number;
	maxTokenDistance?: number;
	maxTokens?: number;
	scoreThreshold?: number;
}

export class Query extends OptionReader<IQueryOptions> {
	private readonly resultsRanking: IQueryResult[] = [];
	private readonly duration: number;

	constructor(index: InvertedIndex, query: string, options: IQueryOptions) {
		super(
			{
				maxResults: 5,
				maxTokenDistance: 2,
				maxTokens: 30,
				scoreThreshold: 0.15
			},
			options
		);

		const pivotTimestamp = performance.now();

		index
			.tokenize(query)
			.slice(0, this.options.maxTokens)
			.forEach((preciseToken: TToken) => {
				index
					.indexedTokens(preciseToken, this.options.maxTokenDistance)
					.forEach((candidateToken: TToken, inverseWeight: number) => {
						const pushToResults = (results: IQueryResult[]) => {
							this.resultsRanking.push(
								...results.map((result: IQueryResult) => {
									result.score *=
										Math.log(this.options.maxTokens - inverseWeight + 2) /
										Math.log(this.options.maxTokens);
									return result;
								})
							);
						};

						if (index.resultsCache.contains(candidateToken)) {
							pushToResults(index.resultsCache.read(candidateToken));

							return;
						}

						const indexing: IIndexing = index.tokenIndexing(candidateToken);

						const idf = Math.log(index.documentAmount() / Object.keys(indexing).length + 1);

						const tokenQueryResults: IQueryResult[] = [];
						for (const document in indexing) {
							const indexes: TTokenIndex[] = indexing[document];

							const tf = (indexing[document] ?? []).length / (index.documentLength(document) + 1);

							tokenQueryResults.push({
								document,
								indexes,
								score: tf * idf
							});
						}

						index.resultsCache.write(candidateToken, tokenQueryResults);

						pushToResults(tokenQueryResults);
					});
			});

		this.resultsRanking = this.resultsRanking.reduce((acc: IQueryResult[], result: IQueryResult) => {
			const index: number = acc.map((r: IQueryResult) => r.document).indexOf(result.document);
			if (!~index) return acc.concat([result]).flat();
			acc[index].score += result.score;

			return acc;
		}, []);

		this.resultsRanking = this.resultsRanking
			.sort((a: IQueryResult, b: IQueryResult) => b.score - a.score)
			.slice(0, this.options.maxResults);

		const normFactor = 1 / this.resultsRanking[0].score;
		this.resultsRanking = this.resultsRanking
			.map((result: IQueryResult) => {
				result.score = result.score * normFactor;
				return result;
			})
			.filter((result: IQueryResult) => result.score >= this.options.scoreThreshold);

		this.duration = performance.now() - pivotTimestamp;
	}

	public results(): IQueryResult[] {
		return this.resultsRanking;
	}

	public time(): number {
		return this.duration;
	}
}
