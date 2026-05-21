import { evaluate } from 'mathjs';

/**
 * Pre-processes a string to convert human-friendly shorthands to numbers.
 * Example: 25k -> 25000, 2jt -> 2000000, 1.5m -> 1500000
 */
function preprocessShorthand(expression: string): string {
	return expression
		.replace(/(\d+(?:\.\d+)?)\s*k/gi, (_, n) => (parseFloat(n) * 1000).toString())
		.replace(/(\d+(?:\.\d+)?)\s*(?:jt|m)/gi, (_, n) => (parseFloat(n) * 1000000).toString());
}

/**
 * Evaluates a mathematical expression string.
 * Returns the result as a number, or null if invalid.
 */
export function evaluateFormula(expression: string): number | null {
	try {
		const processed = preprocessShorthand(expression);
		const result = evaluate(processed);
		if (typeof result === 'number') {
			return result;
		}
		if (typeof result === 'object' && result !== null && 'toNumber' in result) {
			return (result as any).toNumber();
		}
		return null;
	} catch (e) {
		return null;
	}
}
