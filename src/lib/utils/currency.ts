/**
 * Formats a number as currency.
 * Using id-ID as a default for Rp since the user example used numbers like 25000.
 */
export function formatCurrency(value: number, locale = 'id-ID', currency = 'IDR'): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: currency,
		minimumFractionDigits: 0
	}).format(value);
}
