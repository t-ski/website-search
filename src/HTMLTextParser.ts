import { HTMLElement, TextNode, Node, parse as parseHTML } from "node-html-parser";

import { OptionReader } from "./OptionReader";

export interface IParserOptions {
	ignoredTagNames?: string[];
}

export interface ITextNode {
	content: string;
}

export class HTMLTextParser extends OptionReader<IParserOptions> {
	constructor(options: IParserOptions) {
		super(
			{
				ignoredTagNames: ["HEAD", "NOSCRIPT", "SCRIPT", "BUTTON"]
			},
			options
		);

		this.options.ignoredTagNames = this.options.ignoredTagNames.map((tagName: string) => tagName.toUpperCase());
	}

	private textNodeSearch(htmlNode: Node): ITextNode[] {
		let textNodes: ITextNode[] = [];

		htmlNode.childNodes.forEach((childNode: Node) => {
			if (!(childNode instanceof TextNode)) {
				textNodes = textNodes.concat(
					childNode instanceof HTMLElement &&
						!this.options.ignoredTagNames.includes(childNode.rawTagName.toUpperCase())
						? this.textNodeSearch(childNode)
						: []
				);

				return;
			}

			const text = childNode.textContent.trim();

			if (!text.length || /< *!DOCTYPE +\w+ *>/i.test(text)) return;

			textNodes.push({
				content: text
			});
		});

		return textNodes;
	}

	public parse(html: string): ITextNode[] {
		return this.textNodeSearch(parseHTML(html));
	}
}
