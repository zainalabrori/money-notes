import { evaluateFormula } from './formula';

export interface ParsedLine {
	text: string;
	value: number | null;
	expression: string | null;
}

/**
 * Parses a single line to find a numeric value or formula at the end.
 * Example: "Coffee -25000" -> value: -25000
 * Example: "2 * 15000" -> value: 30000
 */
export function parseLine(line: string): ParsedLine {
	const trimmed = line.trim();
	if (!trimmed) return { text: line, value: null, expression: null };

	// Regex to find the last part that looks like a formula/number
	// We look for characters typical in math expressions at the end of the line
	// We want to avoid greedy matching on letters that happen to be k, j, t, m in normal text.
	// It should only match mathematical characters, spaces, and specific suffixes (k, jt, m) attached to numbers.
	const match = trimmed.match(/(?:\s|^)([\(\-]?\d[\d\s\+\-\*\/\(\)\.]*(?:k|jt|m)?)$/i);

	if (match) {
		const expression = match[1].trim();
		// Avoid matching just a single dot or operator
		if (/^[\d\-\(]/.test(expression)) {
			const value = evaluateFormula(expression);
			if (value !== null && !isNaN(value)) {
				return {
					text: trimmed.slice(0, -match[1].length).trim(),
					value,
					expression
				};
			}
		}
	}

	return { text: trimmed, value: null, expression: null };
}

/**
 * Parses the entire content and returns all parsed lines and the total sum.
 */
export function parseContent(content: string) {
	const lines = content.split('\n');
	const parsedLines = lines.map(parseLine);

	let income = 0;
	let expense = 0;

	parsedLines.forEach((line) => {
		if (line.value !== null) {
			if (line.value > 0) {
				income += line.value;
			} else {
				expense += line.value;
			}
		}
	});

	return {
		lines: parsedLines,
		income,
		expense,
		total: income + expense
	};
}
