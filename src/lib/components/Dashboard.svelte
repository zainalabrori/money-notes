<script lang="ts">
	import { notes } from '../stores/notes';
	import { parseContent } from '../parser/note';
	import { formatCurrency } from '../utils/currency';
	import type { Note } from '../db/dexie';

	let { selectedNoteId = $bindable() }: { selectedNoteId: number | null } = $props();

	let allNotes = $state<Note[]>([]);

	$effect(() => {
		const unsubscribe = notes.subscribe((value) => {
			allNotes = value;
		});
		return unsubscribe;
	});

	// Aggregated Lifetime Stats
	let stats = $derived.by(() => {
		let totalIncome = 0;
		let totalExpense = 0;
		allNotes.forEach((note) => {
			const parsed = parseContent(note.content);
			totalIncome += parsed.income;
			totalExpense += Math.abs(parsed.expense);
		});
		return {
			income: totalIncome,
			expense: totalExpense,
			balance: totalIncome - totalExpense
		};
	});

	// Monthly data for the chart (last 6 months)
	let monthlyData = $derived.by(() => {
		const map = new Map<string, { income: number; expense: number }>();
		
		allNotes.forEach((note) => {
			const d = new Date(note.createdAt);
			const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
			const parsed = parseContent(note.content);
			
			const existing = map.get(monthKey) || { income: 0, expense: 0 };
			map.set(monthKey, {
				income: existing.income + parsed.income,
				expense: existing.expense + Math.abs(parsed.expense)
			});
		});

		return Array.from(map.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.slice(-6)
			.map(([monthStr, val]) => {
				const [year, month] = monthStr.split('-');
				const date = new Date(parseInt(year), parseInt(month) - 1, 1);
				const label = date.toLocaleDateString(undefined, { month: 'short' });
				return {
					monthStr,
					label,
					income: val.income,
					expense: val.expense
				};
			});
	});

	let maxVal = $derived(
		Math.max(...monthlyData.map((d) => Math.max(d.income, d.expense)), 100000)
	);

	let recentNotes = $derived(
		[...allNotes]
			.sort((a, b) => b.updatedAt - a.updatedAt)
			.slice(0, 4)
	);

	async function createNewNote() {
		const id = await notes.add();
		selectedNoteId = id;
	}

	function getNoteSummary(content: string) {
		const parsed = parseContent(content);
		return parsed;
	}
</script>

<div class="dashboard-wrapper">
	<div class="welcome-header">
		<h1>Ringkasan Keuangan</h1>
		<p>Pantau catatan keuangan Anda secara visual dan real-time.</p>
	</div>

	<!-- Stats Grid -->
	<div class="stats-grid">
		<div class="stat-card balance-card">
			<div class="card-glow"></div>
			<div class="stat-header">
				<span class="stat-label">Total Saldo</span>
				<div class="icon-wrapper balance-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
				</div>
			</div>
			<span class="stat-value" class:positive={stats.balance >= 0} class:negative={stats.balance < 0}>
				{formatCurrency(stats.balance)}
			</span>
			<span class="stat-subtitle">Akumulasi seluruh catatan</span>
		</div>

		<div class="stat-card income-card">
			<div class="card-glow"></div>
			<div class="stat-header">
				<span class="stat-label">Total Pemasukan</span>
				<div class="icon-wrapper income-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 1.41-1.41L11 15.17V5h2v10.17l4.59-4.59L19 12z" transform="rotate(180 12 12)"/></svg>
				</div>
			</div>
			<span class="stat-value text-income">
				+{formatCurrency(stats.income)}
			</span>
			<span class="stat-subtitle">Uang masuk tercatat</span>
		</div>

		<div class="stat-card expense-card">
			<div class="card-glow"></div>
			<div class="stat-header">
				<span class="stat-label">Total Pengeluaran</span>
				<div class="icon-wrapper expense-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 1.41-1.41L11 15.17V5h2v10.17l4.59-4.59L19 12z"/></svg>
				</div>
			</div>
			<span class="stat-value text-expense">
				-{formatCurrency(stats.expense)}
			</span>
			<span class="stat-subtitle">Uang keluar tercatat</span>
		</div>
	</div>

	<!-- Lower Section -->
	<div class="dashboard-content-grid">
		<!-- Chart Area -->
		<div class="panel chart-panel">
			<div class="panel-header">
				<h2>Tren Bulanan</h2>
				<span class="panel-subtitle">Perbandingan 6 bulan terakhir</span>
			</div>
			
			{#if monthlyData.length === 0}
				<div class="empty-chart-state">
					<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
					<p>Belum ada data visual. Tulis transaksi dalam catatan Anda untuk melihat grafik.</p>
				</div>
			{:else}
				<div class="chart-container">
					<svg class="bar-chart" viewBox="0 0 500 240" preserveAspectRatio="none">
						<!-- Grid Lines -->
						<line x1="40" y1="30" x2="480" y2="30" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,4" />
						<line x1="40" y1="95" x2="480" y2="95" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,4" />
						<line x1="40" y1="160" x2="480" y2="160" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,4" />
						<line x1="40" y1="210" x2="480" y2="210" stroke="var(--border)" stroke-width="1.5" />

						<!-- Max Value indicator -->
						<text x="35" y="34" class="grid-text" text-anchor="end">{formatCurrency(maxVal)}</text>
						<text x="35" y="99" class="grid-text" text-anchor="end">{formatCurrency(maxVal / 2)}</text>
						<text x="35" y="214" class="grid-text" text-anchor="end">0</text>

						<!-- Render Bars -->
						{#each monthlyData as data, idx}
							{@const barGroupWidth = 440 / monthlyData.length}
							{@const groupX = 50 + idx * barGroupWidth}
							{@const incomeHeight = (data.income / maxVal) * 160}
							{@const expenseHeight = (data.expense / maxVal) * 160}

							<!-- Income Bar -->
							<rect
								x={groupX + (barGroupWidth / 2) - 18}
								y={210 - incomeHeight}
								width="12"
								height={incomeHeight}
								rx="4"
								fill="url(#incomeGradient)"
								class="chart-bar"
							>
								<title>Income: {formatCurrency(data.income)}</title>
							</rect>

							<!-- Expense Bar -->
							<rect
								x={groupX + (barGroupWidth / 2) + 2}
								y={210 - expenseHeight}
								width="12"
								height={expenseHeight}
								rx="4"
								fill="url(#expenseGradient)"
								class="chart-bar"
							>
								<title>Expense: {formatCurrency(data.expense)}</title>
							</rect>

							<!-- Axis labels -->
							<text
								x={groupX + (barGroupWidth / 2) - 3}
								y="230"
								class="axis-text"
								text-anchor="middle"
							>
								{data.label}
							</text>
						{/each}

						<!-- Gradients Definitions -->
						<defs>
							<linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color="#10b981" />
								<stop offset="100%" stop-color="rgba(16, 185, 129, 0.3)" />
							</linearGradient>
							<linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color="#f43f5e" />
								<stop offset="100%" stop-color="rgba(244, 63, 94, 0.3)" />
							</linearGradient>
						</defs>
					</svg>
				</div>
				<!-- Chart Legend -->
				<div class="chart-legend">
					<div class="legend-item">
						<span class="legend-color legend-income"></span>
						<span>Pemasukan</span>
					</div>
					<div class="legend-item">
						<span class="legend-color legend-expense"></span>
						<span>Pengeluaran</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Right Column: Recent Notes & Quick Actions -->
		<div class="side-column">
			<!-- Recent Notes Panel -->
			<div class="panel recent-panel">
				<div class="panel-header">
					<h2>Aktivitas Terbaru</h2>
				</div>

				{#if recentNotes.length === 0}
					<div class="empty-recent-state">
						<p>Belum ada catatan keuangan.</p>
					</div>
				{:else}
					<div class="recent-list">
						{#each recentNotes as note}
							{@const summary = getNoteSummary(note.content)}
							<div
								class="recent-item"
								onclick={() => (selectedNoteId = note.id!)}
								onkeydown={(e) => e.key === 'Enter' && (selectedNoteId = note.id!)}
								role="button"
								tabindex="0"
							>
								<div class="recent-info">
									<span class="recent-title">{note.title || 'Untitled Note'}</span>
									<span class="recent-date">
										{new Date(note.updatedAt).toLocaleDateString(undefined, {
											month: 'short',
											day: 'numeric'
										})}
									</span>
								</div>
								
								<div class="recent-badges">
									{#if summary.income > 0}
										<span class="badge badge-in">+{formatCurrency(summary.income)}</span>
									{/if}
									{#if summary.expense < 0}
										<span class="badge badge-out">-{formatCurrency(Math.abs(summary.expense))}</span>
									{/if}
									{#if summary.income === 0 && summary.expense === 0}
										<span class="badge badge-empty">Kosong</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Quick Actions Panel -->
			<div class="panel actions-panel">
				<div class="panel-header">
					<h2>Akses Cepat</h2>
				</div>
				<div class="actions-grid">
					<button onclick={createNewNote} class="action-btn primary-action">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>
						<span>Buat Catatan Baru</span>
					</button>
				</div>
				<div class="shortcuts-guide">
					<div class="shortcut-row">
						<span class="shortcut-label">Buat Catatan</span>
						<kbd>Ctrl + N</kbd>
					</div>
					<div class="shortcut-row">
						<span class="shortcut-label">Tutup Sidebar</span>
						<kbd>Ctrl + B</kbd>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard-wrapper {
		flex: 1;
		padding: 2.5rem;
		overflow-y: auto;
		background: radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.05) 0%, rgba(11, 15, 25, 0) 70%);
		display: flex;
		flex-direction: column;
		gap: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	.welcome-header h1 {
		font-size: 2.2rem;
		font-weight: 800;
		background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		margin: 0 0 0.5rem 0;
		letter-spacing: -0.02em;
	}

	.welcome-header p {
		color: var(--text-secondary);
		font-size: 1.1rem;
		margin: 0;
		font-weight: 400;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.stat-card {
		position: relative;
		background: var(--bg-card);
		backdrop-filter: blur(10px);
		border: 1px solid var(--border-glass);
		padding: 1.5rem;
		border-radius: 16px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		box-shadow: var(--shadow-md);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.stat-card:hover {
		transform: translateY(-4px);
		border-color: rgba(139, 92, 246, 0.2);
		box-shadow: var(--shadow-lg), var(--shadow-glow);
	}

	.card-glow {
		position: absolute;
		top: -50%;
		right: -30%;
		width: 150px;
		height: 150px;
		background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0) 70%);
		filter: blur(20px);
		pointer-events: none;
	}

	.stat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.stat-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.icon-wrapper {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.balance-icon {
		background: rgba(139, 92, 246, 0.1);
		color: var(--accent-light);
	}

	.income-icon {
		background: var(--income-bg);
		color: var(--income);
	}

	.expense-icon {
		background: var(--expense-bg);
		color: var(--expense);
	}

	.stat-value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 1.8rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.stat-value.positive {
		color: var(--income);
		text-shadow: 0 0 10px var(--income-glow);
	}

	.stat-value.negative {
		color: var(--expense);
		text-shadow: 0 0 10px var(--expense-glow);
	}

	.text-income {
		color: var(--income);
		text-shadow: 0 0 10px var(--income-glow);
	}

	.text-expense {
		color: var(--expense);
		text-shadow: 0 0 10px var(--expense-glow);
	}

	.stat-subtitle {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	/* Main panels layout */
	.dashboard-content-grid {
		display: grid;
		grid-template-columns: 3fr 2fr;
		gap: 1.5rem;
		align-items: start;
	}

	@media (max-width: 900px) {
		.dashboard-content-grid {
			grid-template-columns: 1fr;
		}
	}

	.panel {
		background: var(--bg-card);
		backdrop-filter: blur(10px);
		border: 1px solid var(--border-glass);
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: var(--shadow-sm);
	}

	.panel-header {
		margin-bottom: 1.25rem;
	}

	.panel-header h2 {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 0.2rem 0;
		color: var(--text-primary);
	}

	.panel-subtitle {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	/* Chart styles */
	.chart-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.empty-chart-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 240px;
		color: var(--text-tertiary);
		text-align: center;
		gap: 1rem;
		padding: 2rem;
	}

	.empty-chart-state p {
		font-size: 0.9rem;
		max-width: 320px;
		margin: 0;
		line-height: 1.6;
	}

	.chart-container {
		position: relative;
		width: 100%;
		padding: 0.5rem 0;
	}

	.bar-chart {
		width: 100%;
		height: 240px;
		overflow: visible;
	}

	.grid-text {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		fill: var(--text-tertiary);
	}

	.axis-text {
		font-size: 11px;
		font-weight: 600;
		fill: var(--text-secondary);
	}

	.chart-bar {
		transition: all 0.3s ease;
	}

	.chart-bar:hover {
		filter: brightness(1.2);
		cursor: pointer;
	}

	.chart-legend {
		display: flex;
		gap: 1.5rem;
		justify-content: center;
		margin-top: 1rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.legend-color {
		width: 12px;
		height: 12px;
		border-radius: 3px;
	}

	.legend-income {
		background: var(--income);
		box-shadow: 0 0 6px var(--income-glow);
	}

	.legend-expense {
		background: var(--expense);
		box-shadow: 0 0 6px var(--expense-glow);
	}

	/* Side Column items */
	.side-column {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.recent-panel {
		flex: 1;
	}

	.empty-recent-state {
		padding: 2rem;
		text-align: center;
		color: var(--text-tertiary);
		font-size: 0.9rem;
	}

	.recent-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.recent-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid var(--border-glass);
		border-radius: 10px;
		cursor: pointer;
		outline: none;
		transition: all 0.2s ease;
	}

	.recent-item:hover {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(139, 92, 246, 0.2);
		transform: translateX(2px);
	}

	.recent-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.recent-title {
		font-weight: 600;
		color: var(--text-primary);
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.recent-date {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	.recent-badges {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.badge {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.badge-in {
		color: var(--income);
		background: var(--income-bg);
	}

	.badge-out {
		color: var(--expense);
		background: var(--expense-bg);
	}

	.badge-empty {
		color: var(--text-tertiary);
		background: rgba(255, 255, 255, 0.05);
	}

	/* Actions and Guide */
	.action-btn {
		width: 100%;
		padding: 0.8rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		border-radius: 10px;
		border: 1px solid transparent;
	}

	.primary-action {
		background: linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%);
		color: white;
		box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
	}

	.primary-action:hover {
		background: linear-gradient(135deg, var(--accent-light) 0%, var(--accent) 100%);
		box-shadow: 0 4px 16px rgba(139, 92, 246, 0.35);
		transform: translateY(-1px);
	}

	.shortcuts-guide {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.shortcut-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.8rem;
	}

	.shortcut-label {
		color: var(--text-secondary);
	}

	kbd {
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
		color: var(--accent-light);
		padding: 2px 6px;
		border-radius: 4px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
	}

	@media (max-width: 600px) {
		.dashboard-wrapper {
			padding: 1.25rem;
			gap: 1.25rem;
		}

		.welcome-header h1 {
			font-size: 1.8rem;
		}

		.welcome-header p {
			font-size: 0.95rem;
		}
	}
</style>
