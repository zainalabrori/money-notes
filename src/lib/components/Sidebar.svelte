<script lang="ts">
	import { notes } from '../stores/notes';
	import { parseContent } from '../parser/note';
	import type { Note } from '../db/dexie';
	import Backup from './Backup.svelte';
	import { formatCurrency } from '../utils/currency';

	let {
		selectedNoteId = $bindable(),
		isSidebarVisible = $bindable()
	}: {
		selectedNoteId: number | null;
		isSidebarVisible: boolean;
	} = $props();

	let allNotes    = $state<Note[]>([]);
	let searchQuery = $state('');
	let selectedMonth = $state<string>('all');
	let selectedTag   = $state<string | null>(null);

	// Collect unique tags from all notes
	let allTags = $derived.by(() => {
		const tags = new Set<string>();
		allNotes.forEach((n) => n.tags?.forEach((t) => tags.add(t)));
		return Array.from(tags).sort();
	});

	// Filter + sort notes by search, month, and tag
	let filteredNotes = $derived(
		allNotes
			.filter((note) => {
				const q = searchQuery.toLowerCase();
				const matchSearch =
					note.title.toLowerCase().includes(q) ||
					note.content.toLowerCase().includes(q);

				const matchMonth =
					selectedMonth === 'all' ||
					(() => {
						const d = new Date(note.createdAt);
						const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
						return key === selectedMonth;
					})();

				const matchTag =
					selectedTag === null ||
					(note.tags && note.tags.includes(selectedTag));

				return matchSearch && matchMonth && matchTag;
			})
			.sort((a, b) => b.updatedAt - a.updatedAt)
	);

	// Build list of months that have at least one note
	let availableMonths = $derived.by(() => {
		const months = new Set<string>();
		allNotes.forEach((n) => {
			const d = new Date(n.createdAt);
			months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
		});
		return Array.from(months).sort().reverse();
	});

	$effect(() => {
		const unsub = notes.subscribe((v) => { allNotes = v; });
		return unsub;
	});

	async function createNote() {
		selectedNoteId = await notes.add();
	}

	async function deleteNote(id: number) {
		if (confirm('Hapus catatan ini? Tidak bisa dibatalkan.')) {
			await notes.delete(id);
			if (selectedNoteId === id) selectedNoteId = null;
		}
	}

	// Format month key "YYYY-MM" → "Januari 2025" etc.
	function formatMonth(key: string) {
		const [year, month] = key.split('-');
		return new Date(Number(year), Number(month) - 1).toLocaleDateString('id-ID', {
			month: 'long',
			year: 'numeric'
		});
	}

	// Format a timestamp as a relative label
	function formatDate(ts: number) {
		const d = new Date(ts);
		return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<aside class="sidebar" class:collapsed={!isSidebarVisible}>
	<!-- ── Header ───────────────────────────────────── -->
	<div class="sidebar-header">
		<span class="sidebar-title">Catatan Saya</span>
		<button
			class="icon-btn"
			onclick={() => (isSidebarVisible = false)}
			title="Tutup daftar (Ctrl+B)"
		>
			<!-- Panel-left-close icon -->
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
				fill="none" stroke="currentColor" stroke-width="2.5"
				stroke-linecap="round" stroke-linejoin="round">
				<rect width="18" height="18" x="3" y="3" rx="2"/>
				<path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>
			</svg>
		</button>
	</div>

	<!-- ── New Note button ──────────────────────────── -->
	<div class="actions-area">
		<button class="new-note-btn" onclick={createNote} title="Buat catatan baru (Ctrl+N)">
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
				fill="none" stroke="currentColor" stroke-width="2.5"
				stroke-linecap="round" stroke-linejoin="round">
				<path d="M12 5v14M5 12h14"/>
			</svg>
			Catatan Baru
		</button>
	</div>

	<!-- ── Search & month filter ────────────────────── -->
	<div class="filters">
		<div class="search-box">
			<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
				fill="none" stroke="currentColor" stroke-width="2.5"
				stroke-linecap="round" stroke-linejoin="round" class="search-icon">
				<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
			</svg>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari catatan..."
				class="search-input"
			/>
		</div>

		<select bind:value={selectedMonth} class="month-select">
			<option value="all">Semua bulan</option>
			{#each availableMonths as month}
				<option value={month}>{formatMonth(month)}</option>
			{/each}
		</select>
	</div>

	<!-- ── Tag filter pills ─────────────────────────── -->
	{#if allTags.length > 0}
		<div class="tag-bar">
			<div class="tag-scroll">
				<button
					class="tag-pill"
					class:active={selectedTag === null}
					onclick={() => selectedTag = null}
				>
					Semua
				</button>
				{#each allTags as tag}
					<button
						class="tag-pill"
						class:active={selectedTag === tag}
						onclick={() => selectedTag = tag}
					>
						{tag}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── Note list ─────────────────────────────────── -->
	<div class="note-list">
		{#if filteredNotes.length === 0}
			<div class="empty-list">
				<p>Tidak ada catatan ditemukan</p>
			</div>
		{:else}
			{#each filteredNotes as note}
				{@const fin = parseContent(note.content)}
				<div
					class="note-item"
					class:active={selectedNoteId === note.id}
					onclick={() => (selectedNoteId = note.id!)}
					onkeydown={(e) => e.key === 'Enter' && (selectedNoteId = note.id!)}
					role="button"
					tabindex="0"
				>
					<div class="note-meta">
						<!-- Title row -->
						<div class="note-top-row">
							<span class="note-title">
								{note.title || 'Catatan tanpa judul'}
							</span>
							<!-- Net balance badge -->
							<span class="note-balance" class:pos={fin.total >= 0} class:neg={fin.total < 0}>
								{fin.total >= 0 ? '+' : ''}{formatCurrency(fin.total)}
							</span>
						</div>

						<!-- Date + tags row -->
						<div class="note-bottom-row">
							<span class="note-date">{formatDate(note.updatedAt)}</span>
							{#if note.tags && note.tags.length > 0}
								<div class="note-tags">
									{#each note.tags.slice(0, 2) as tag}
										<span class="note-tag">{tag}</span>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<!-- Delete button (visible on hover) -->
					<button
						class="delete-btn"
						onclick={(e) => { e.stopPropagation(); deleteNote(note.id!); }}
						title="Hapus catatan"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
							fill="none" stroke="currentColor" stroke-width="2.5"
							stroke-linecap="round" stroke-linejoin="round">
							<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
							<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
						</svg>
					</button>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Backup/export section at bottom -->
	<Backup />
</aside>

<style>
	/* ── Sidebar shell ───────────────────────────────── */
	/*
	 * Pakai transform + width:0 trick:
	 * - Saat terbuka  : width 280px, transform none  → mengambil space di flex
	 * - Saat collapsed: width 0,     overflow hidden  → tidak mengambil space
	 * Satu pendekatan untuk semua breakpoint, tidak perlu margin hack.
	 */
	.sidebar {
		width: 280px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		background: var(--bg-secondary);
		border-right: 1px solid var(--border);
		overflow: hidden;
		transition: width 0.3s cubic-bezier(.4,0,.2,1);
		z-index: 5;
	}

	.sidebar.collapsed {
		width: 0;
		border-right-width: 0;
	}

	/* Mobile: sidebar jadi overlay di atas konten */
	@media (max-width: 600px) {
		.sidebar {
			position: absolute;
			width: 280px; /* selalu 280px di mobile, pakai transform untuk hide/show */
			height: 100%;
			left: 0;
			box-shadow: 4px 0 24px rgba(0,0,0,.6);
			transition: transform 0.3s cubic-bezier(.4,0,.2,1);
			overflow: hidden; /* jangan auto — cegah scroll body merembes */
			z-index: 10; /* harus di atas backdrop (z-index: 9) */
		}

		.sidebar.collapsed {
			width: 280px;       /* reset override dari desktop */
			border-right-width: 1px;
			transform: translateX(-100%);
		}
	}

	/* ── Header ─────────────────────────────────────── */
	.sidebar-header {
		padding: 0.9rem 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--border);
	}

	.sidebar-title {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.icon-btn {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--text-secondary);
		padding: 5px 7px;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		transition: all 0.2s;
	}

	.icon-btn:hover {
		color: var(--text-primary);
		background: var(--bg-tertiary);
		border-color: var(--text-secondary);
	}

	/* ── New note button ─────────────────────────────── */
	.actions-area {
		padding: 0.75rem 1rem 0.5rem;
	}

	.new-note-btn {
		width: 100%;
		background: var(--bg-primary);
		border: 1px solid var(--border);
		color: var(--accent);
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 6px;
		transition: all 0.2s;
	}

	.new-note-btn:hover {
		background: var(--bg-tertiary);
		border-color: var(--text-secondary);
	}

	/* ── Filters ─────────────────────────────────────── */
	.filters {
		padding: 0 1rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border-bottom: 1px solid var(--border);
	}

	.search-box {
		display: flex;
		align-items: center;
		background: var(--bg-primary);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0 10px;
		gap: 7px;
		height: 34px;
	}

	.search-box:focus-within {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-glow);
	}

	.search-icon { color: var(--text-tertiary); flex-shrink: 0; }

	.search-input {
		background: transparent !important;
		border: none !important;
		padding: 0 !important;
		box-shadow: none !important;
		font-size: 0.82rem !important;
		width: 100%;
		color: var(--text-primary);
	}

	.month-select {
		width: 100%;
		height: 34px;
		font-size: 0.82rem;
		padding: 0 8px;
		background: var(--bg-primary);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		color: var(--text-primary);
	}

	/* ── Tag pills ───────────────────────────────────── */
	.tag-bar {
		padding: 0.6rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	.tag-scroll {
		display: flex;
		gap: 4px;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.tag-scroll::-webkit-scrollbar { display: none; }

	.tag-pill {
		background: var(--bg-primary);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		padding: 2px 10px;
		border-radius: 999px;
		font-size: 0.75rem;
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.15s;
	}

	.tag-pill:hover {
		color: var(--text-primary);
		border-color: var(--text-secondary);
	}

	.tag-pill.active {
		background: var(--accent);
		color: var(--bg-primary);
		border-color: var(--accent);
		font-weight: 700;
	}

	/* ── Note list ───────────────────────────────────── */
	.note-list { flex: 1; overflow-y: auto; }

	.empty-list {
		padding: 2.5rem 1rem;
		text-align: center;
		color: var(--text-tertiary);
		font-size: 0.82rem;
	}

	.note-item {
		cursor: pointer;
		padding: 0.65rem 1rem;
		border-bottom: 1px solid var(--border);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		outline: none;
		transition: background 0.15s;
	}

	.note-item:hover  { background: var(--bg-tertiary); }
	.note-item.active { background: var(--selection); }

	.note-meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.note-top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.note-title {
		font-size: 0.83rem;
		font-weight: 500;
		color: var(--text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.note-item.active .note-title { color: var(--text-primary); font-weight: 700; }

	.note-balance {
		font-size: 0.75rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.note-balance.pos { color: var(--income); }
	.note-balance.neg { color: var(--expense); }

	.note-bottom-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.note-date {
		font-size: 0.68rem;
		color: var(--text-tertiary);
	}

	.note-tags {
		display: flex;
		gap: 3px;
	}

	.note-tag {
		font-size: 0.62rem;
		color: #fb923c;
		background: rgba(251,146,60,.1);
		border: 1px solid rgba(251,146,60,.2);
		padding: 1px 5px;
		border-radius: 4px;
	}

	/* Delete button: hidden until hover */
	.delete-btn {
		background: none;
		border: none;
		color: var(--text-tertiary);
		padding: 5px;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		opacity: 0;
		transition: opacity 0.2s, color 0.2s, background 0.2s;
	}

	.note-item:hover .delete-btn { opacity: 1; }

	.delete-btn:hover {
		color: var(--expense);
		background: rgba(248,113,113,.1);
	}
</style>
