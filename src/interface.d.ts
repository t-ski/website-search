import { TDocument, TTokenIndex } from "./types";

export interface IIndexing {
	[document: TDocument]: TTokenIndex[]; // freq(document)
}

export interface IQueryResult {
	document: TDocument;
	indexes: TTokenIndex[];
	score: number;
}
