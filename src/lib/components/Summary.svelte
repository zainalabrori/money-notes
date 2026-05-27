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
</script>

<div class="summary-card">
	<div class="summary-data">
		<div class="data-block block-income">
			<span class="block-label">Pemasukan</span>
			<span class="block-value">+{formatCurrency(income)}</span>
		</div>
		
		<div class="data-block block-expense">
			<span class="block-label">Pengeluaran</span>
			<span class="block-value">-{formatCurrency(Math.abs(expense))}</span>
		</div>

		<div class="data-block block-balance">
			<span class="block-label">Sisa Saldo</span>
			<span class="block-value" class:positive={total >= 0} class:negative={total < 0}>
				{formatCurrency(total)}
			</span>
		</div>
	</div>

	<!-- Expense Ratio Meter -->
	{#if income > 0 || Math.abs(expense) > 0}
		<div class="ratio-section">
			<div class="ratio-meta">
				<span class="ratio-label">Rasio Penggunaan Dana</span>
				<span class="ratio-percentage" class:deficit={isDeficit} class:warning={expenseRatio > 50 && expenseRatio <= 80} class:safe={expenseRatio <= 50 && !isDeficit}>
					{isDeficit ? 'Defisit 100%' : `${Math.round(expenseRatio)}%`}
				</span>
			</div>
			
			<div class="ratio-bar-track">
				<div 
					class="ratio-bar-fill {ratioColorClass}" 
					style="width: {isDeficit ? 100 : expenseRatio}%"
				></div>
			</div>
			
			<span class="ratio-desc">
				{#if isDeficit}
					⚠️ Semua catatan ini merupakan pengeluaran tanpa adanya pemasukan.
				{:else if expenseRatio > 80}
					🚨 Pengeluaran kritis! Sudah melampaui 80% dari total pemasukan Anda.
				{:else if expenseRatio > 50}
					⚠️ Pengeluaran sedang. Pemasukan masih tersisa sekitar {Math.round(100 - expenseRatio)}%.
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
		gap: 1.25rem;
		padding: 1.25rem;
		border-top: 1px solid var(--border);
		background: rgba(18, 24, 38, 0.4);
		border-radius: 12px;
		margin-top: 0.5rem;
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
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.block-value {
		font-family: 'JetBrains Mono', monospace;
		font-weight: 700;
		font-size: 1.05rem;
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
		text-shadow: 0 0 8px var(--income-glow);
	}

	.block-balance .block-value.negative {
		color: var(--expense);
		text-shadow: 0 0 8px var(--expense-glow);
	}

	/* Ratio Meter */
	.ratio-section {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding-top: 0.75rem;
		border-top: 1px dashed var(--border);
	}

	.ratio-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.ratio-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.ratio-percentage {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--expense);
	}

	.ratio-percentage.safe {
		color: var(--income);
	}

	.ratio-percentage.warning {
		color: #f59e0b;
	}

	.ratio-bar-track {
		height: 6px;
		background: var(--bg-tertiary);
		border-radius: 10px;
		overflow: hidden;
		width: 100%;
	}

	.ratio-bar-fill {
		height: 100%;
		border-radius: 10px;
		transition: width 0.3s ease;
	}

	.ratio-safe {
		background: linear-gradient(90deg, #10b981, #34d399);
		box-shadow: 0 0 6px var(--income-glow);
	}

	.ratio-warning {
		background: linear-gradient(90deg, #f59e0b, #fbbf24);
		box-shadow: 0 0 6px rgba(245, 158, 11, 0.2);
	}

	.ratio-danger {
		background: linear-gradient(90deg, #f43f5e, #fda4af);
		box-shadow: 0 0 6px var(--expense-glow);
	}

	.ratio-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	@media (max-width: 600px) {
		.summary-card {
			gap: 1rem;
			padding: 1rem;
		}

		.summary-data {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.data-block {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
			padding: 0.2rem 0;
		}

		.block-value {
			font-size: 0.95rem;
		}

		.block-balance {
			border-top: 1px solid var(--border);
			padding-top: 0.5rem;
			margin-top: 0.25rem;
		}
	}
</style>
