<script lang="ts">
	import { formatCurrency } from '../utils/currency';

	let { income, expense, total } = $props();
</script>

<div class="summary">
	<div class="row">
		<span class="label">In</span>
		<span class="value income">+{formatCurrency(income)}</span>
	</div>
	<div class="row">
		<span class="label">Out</span>
		<span class="value expense">-{formatCurrency(Math.abs(expense))}</span>
	</div>
	<div class="row total-row">
		<span class="label">Balance</span>
		<span class="value" class:income={total >= 0} class:expense={total < 0}>
			{formatCurrency(total)}
		</span>
	</div>
</div>

<style>
	.summary {
		display: flex;
		gap: 2rem;
		padding: 1rem 0;
		border-top: 1px solid var(--border);
		background: var(--bg-primary);
	}

	.row {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-secondary);
	}

	.value {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-weight: 600;
		font-size: 1rem;
	}

	.income {
		color: var(--income);
	}

	.expense {
		color: var(--expense);
	}

	.total-row .value {
		font-size: 1.1rem;
	}

	@media (max-width: 600px) {
		.summary {
			gap: 1rem;
			justify-content: space-between;
		}
	}
</style>
