<script lang="ts">
	import { formatCurrency } from '../utils/currency';

	let { income = 0, expense = 0, total = 0 } = $props();

	let expenseRatio = $derived(income > 0 ? Math.min((Math.abs(expense) / income) * 100, 100) : 0);
	let isDeficit = $derived(income === 0 && Math.abs(expense) > 0);

	let ratioColorClass = $derived.by(() => {
		if (isDeficit || expenseRatio > 80) return 'ratio-danger';
		if (expenseRatio > 50) return 'ratio-warning';
		return 'ratio-safe';
	});

	const barChars = 20;
	let filledChars = $derived(isDeficit ? barChars : Math.round((expenseRatio / 100) * barChars));
	let emptyChars = $derived(barChars - filledChars);
</script>

<div class="summary-card">
	<div class="summary-header">
		<span class="cli-section-header">Summary (git diff --stat):</span>
	</div>
	<div class="summary-data">
		<div class="data-block block-income">
			<span class="block-label">pemasukan (+)</span>
			<span class="block-value">+{formatCurrency(income)}</span>
		</div>
		
		<div class="data-block block-expense">
			<span class="block-label">pengeluaran (-)</span>
			<span class="block-value">-{formatCurrency(Math.abs(expense))}</span>
		</div>

		<div class="data-block block-balance">
			<span class="block-label">saldo (net)</span>
			<span class="block-value" class:positive={total >= 0} class:negative={total < 0}>
				{formatCurrency(total)}
			</span>
		</div>
	</div>

	<!-- Expense Ratio CLI Progress Bar -->
	{#if income > 0 || Math.abs(expense) > 0}
		<div class="ratio-section">
			<div class="ratio-meta">
				<span class="ratio-label">ratio:</span>
				<span class="ratio-percentage" class:deficit={isDeficit} class:warning={expenseRatio > 50 && expenseRatio <= 80} class:safe={expenseRatio <= 50 && !isDeficit}>
					{isDeficit ? 'DEFICIT 100%' : `${Math.round(expenseRatio)}%`}
				</span>
			</div>
			
			<div class="ratio-cli-bar">
				<span class="bar-brackets">[</span>
				<span class="bar-fill {ratioColorClass}">{"=".repeat(Math.max(0, filledChars - 1)) + (filledChars > 0 ? ">" : "")}</span>
				<span class="bar-empty">{".".repeat(emptyChars)}</span>
				<span class="bar-brackets">]</span>
			</div>
			
			<span class="ratio-desc">
				{#if isDeficit}
					⚠️ Semua transaksi merupakan pengeluaran (deficit).
				{:else if expenseRatio > 80}
					🚨 Pengeluaran kritis! Sudah melampaui 80% dari total pemasukan.
				{:else if expenseRatio > 50}
					⚠️ Pengeluaran sedang. Sisa dana sekitar {Math.round(100 - expenseRatio)}%.
				{:else if expenseRatio > 0}
					✨ Sangat bagus! Pengeluaran terkendali di bawah 50% pemasukan.
				{:else}
					Pemasukan penuh, belum ada pengeluaran terdaftar.
				{/if}
			</span>
		</div>
	{/if}
</div>

<style>
	.summary-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border-top: 1px solid var(--border);
		background: var(--bg-secondary);
		border-radius: 6px;
		margin-top: 0.5rem;
	}

	.cli-section-header {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		font-family: 'JetBrains Mono', monospace;
	}

	.summary-data {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.data-block {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.block-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: lowercase;
		color: var(--text-tertiary);
		font-family: 'JetBrains Mono', monospace;
	}

	.block-value {
		font-family: 'JetBrains Mono', monospace;
		font-weight: 700;
		font-size: 0.95rem;
		white-space: nowrap;
	}

	.block-income .block-value {
		color: var(--income);
	}

	.block-expense .block-value {
		color: var(--expense);
	}

	.block-balance .block-value.positive {
		color: var(--income);
	}

	.block-balance .block-value.negative {
		color: var(--expense);
	}

	/* Ratio Meter */
	.ratio-section {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding-top: 0.6rem;
		border-top: 1px dashed var(--border);
	}

	.ratio-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.ratio-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-tertiary);
		font-family: 'JetBrains Mono', monospace;
	}

	.ratio-percentage {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--expense);
	}

	.ratio-percentage.safe {
		color: var(--income);
	}

	.ratio-percentage.warning {
		color: #ff9f43;
	}

	.ratio-cli-bar {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.95rem;
		display: flex;
		align-items: center;
		letter-spacing: 0.5px;
	}

	.bar-brackets {
		color: var(--text-tertiary);
		font-weight: 700;
	}

	.bar-empty {
		color: var(--text-tertiary);
	}

	.bar-fill.ratio-safe {
		color: var(--income);
	}

	.bar-fill.ratio-warning {
		color: #ff9f43;
	}

	.bar-fill.ratio-danger {
		color: var(--expense);
	}

	.ratio-desc {
		font-size: 0.7rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	@media (max-width: 600px) {
		.summary-card {
			gap: 0.75rem;
			padding: 0.75rem;
		}

		.summary-data {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.data-block {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
			padding: 0.1rem 0;
		}

		.block-value {
			font-size: 0.85rem;
		}

		.block-balance {
			border-top: 1px solid var(--border);
			padding-top: 0.4rem;
			margin-top: 0.2rem;
		}
	}
</style>
