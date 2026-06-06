<script lang="ts">
	import { formatCurrency } from '../utils/currency';

	let { income = 0, expense = 0, total = 0 } = $props();

	// Percentage of income that has been spent
	let expenseRatio = $derived(income > 0 ? Math.min((Math.abs(expense) / income) * 100, 100) : 0);
	let isDeficit = $derived(income === 0 && Math.abs(expense) > 0);

	// Color category for the ratio bar
	let ratioLevel = $derived.by(() => {
		if (isDeficit || expenseRatio > 80) return 'danger';
		if (expenseRatio > 50) return 'warning';
		return 'safe';
	});

	// Human-readable advice based on spending ratio
	let ratioMessage = $derived.by(() => {
		if (isDeficit) return '⚠️ Semua transaksi adalah pengeluaran. Tidak ada pemasukan tercatat.';
		if (expenseRatio > 80)
			return '🚨 Pengeluaran sudah melampaui 80% dari pemasukan. Perhatikan pengeluaran Anda!';
		if (expenseRatio > 50)
			return `⚠️ Pengeluaran cukup besar. Sisa ${Math.round(100 - expenseRatio)}% dari pemasukan.`;
		if (expenseRatio > 0)
			return `✅ Bagus! Pengeluaran masih terkendali di ${Math.round(expenseRatio)}% dari pemasukan.`;
		return 'Pemasukan penuh — belum ada pengeluaran tercatat.';
	});

	// Progress bar character count
	const BAR_LEN = 20;
	let filled = $derived(isDeficit ? BAR_LEN : Math.round((expenseRatio / 100) * BAR_LEN));
	let empty = $derived(BAR_LEN - filled);
</script>

<div class="summary">
	<!-- ── Three stat blocks ─────────────────────── -->
	<div class="stats">
		<div class="stat">
			<span class="stat-label">Pemasukan</span>
			<span class="stat-value income">+{formatCurrency(income)}</span>
		</div>

		<div class="divider"></div>

		<div class="stat">
			<span class="stat-label">Pengeluaran</span>
			<span class="stat-value expense">-{formatCurrency(Math.abs(expense))}</span>
		</div>

		<div class="divider"></div>

		<div class="stat">
			<span class="stat-label">Saldo Akhir</span>
			<span class="stat-value balance" class:positive={total >= 0} class:negative={total < 0}>
				{formatCurrency(total)}
			</span>
		</div>
	</div>

	<!-- ── Spending ratio bar ─────────────────────── -->
	{#if income > 0 || Math.abs(expense) > 0}
		<div class="ratio-section">
			<div class="ratio-header">
				<span class="ratio-title">Rasio Pengeluaran</span>
				<span class="ratio-pct {ratioLevel}">
					{isDeficit ? 'Defisit' : `${Math.round(expenseRatio)}%`}
				</span>
			</div>

			<!-- ASCII-style progress bar (keep the original character-art charm) -->
			<div class="ratio-bar">
				<span class="bar-bracket">[</span>
				<span class="bar-fill {ratioLevel}">
					{'='.repeat(Math.max(0, filled - 1))}{filled > 0 ? '>' : ''}
				</span>
				<span class="bar-empty">{'·'.repeat(empty)}</span>
				<span class="bar-bracket">]</span>
			</div>

			<p class="ratio-msg">{ratioMessage}</p>
		</div>
	{/if}
</div>

<style>
	.summary {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		padding: 0.85rem 1rem;
		border-top: 1px solid var(--border);
		background: var(--bg-secondary);
		border-radius: 0 0 var(--radius-md) var(--radius-md);
	}

	/* ── Stats row ───────────────────────────────── */
	.stats {
		display: flex;
		align-items: center;
		gap: 0;
	}

	.stat {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.stat-label {
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-tertiary);
	}

	.stat-value {
		font-size: 0.95rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.stat-value.income {
		color: var(--income);
	}
	.stat-value.expense {
		color: var(--expense);
	}
	.stat-value.balance.positive {
		color: var(--income);
	}
	.stat-value.balance.negative {
		color: var(--expense);
	}

	.divider {
		width: 1px;
		height: 32px;
		background: var(--border);
		margin: 0 1rem;
		flex-shrink: 0;
	}

	/* ── Ratio section ───────────────────────────── */
	.ratio-section {
		display: flex;
		flex-direction: column;
		gap: 5px;
		padding-top: 0.6rem;
		border-top: 1px dashed var(--border);
	}

	.ratio-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.ratio-title {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.ratio-pct {
		font-size: 0.8rem;
		font-weight: 700;
	}

	.ratio-pct.safe {
		color: var(--income);
	}
	.ratio-pct.warning {
		color: #fb923c;
	}
	.ratio-pct.danger {
		color: var(--expense);
	}

	/* ASCII bar */
	.ratio-bar {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.9rem;
		display: flex;
		letter-spacing: 0.5px;
		user-select: none;
	}

	.bar-bracket {
		color: var(--text-tertiary);
		font-weight: 700;
	}
	.bar-empty {
		color: var(--text-tertiary);
	}

	.bar-fill.safe {
		color: var(--income);
	}
	.bar-fill.warning {
		color: #fb923c;
	}
	.bar-fill.danger {
		color: var(--expense);
	}

	.ratio-msg {
		margin: 0;
		font-size: 0.72rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	/* ── Mobile ──────────────────────────────────── */
	@media (max-width: 600px) {
		.stats {
			flex-direction: column;
			align-items: stretch;
			gap: 0;
		}

		.stat {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
			padding: 4px 0;
		}

		.divider {
			width: 100%;
			height: 1px;
			margin: 0;
		}

		.stat:last-child {
			border-top: 1px solid var(--border);
			padding-top: 6px;
			margin-top: 2px;
		}

		.stat-value {
			font-size: 0.88rem;
		}
	}
</style>
