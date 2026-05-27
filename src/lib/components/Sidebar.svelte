<script lang="ts">
	import { notes } from '../stores/notes';
	import { parseContent } from '../parser/note';
	import type { Note } from '../db/dexie';
	import Backup from './Backup.svelte';

	let {
		selectedNoteId = $bindable(),
		isSidebarVisible = $bindable()
	}: {
		selectedNoteId: number | null;
		isSidebarVisible: boolean;
	} = $props();

	let allNotes = $state<Note[]>([]);
	let searchQuery = $state('');
	let selectedMonth = $state<string>('all'); // format: YYYY-MM
	let selectedTag = $state<string | null>(null);

	// Derived: all unique tags present in the notes
	let allTags = $derived.by(() => {
		const tags = new Set<string>();
		allNotes.forEach((n) => {
			if (n.tags) {
				n.tags.forEach((t) => tags.add(t));
			}
		});
		return Array.from(tags).sort();
	});

	let filteredNotes = $derived(
		allNotes
			.filter((note) => {
				const matchesSearch =
					note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					note.content.toLowerCase().includes(searchQuery.toLowerCase());

				const matchesMonth =
					selectedMonth === 'all' ||
					(() => {
						const noteDate = new Date(note.createdAt);
						const monthKey = `${noteDate.getFullYear()}-${String(noteDate.getMonth() + 1).padStart(2, '0')}`;
						return monthKey === selectedMonth;
					})();

				const matchesTag =
					selectedTag === null ||
					(note.tags && note.tags.includes(selectedTag));

				return matchesSearch && matchesMonth && matchesTag;
			})
			.sort((a, b) => b.updatedAt - a.updatedAt)
	);

	let availableMonths = $derived.by(() => {
		const months = new Set<string>();
		allNotes.forEach((n) => {
			const d = new Date(n.createdAt);
			months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
		});
		return Array.from(months).sort().reverse();
	});

	$effect(() => {
		const unsubscribe = notes.subscribe((value) => {
			allNotes = value;
		});
		return unsubscribe;
	});

	async function createNote() {
		const id = await notes.add();
		selectedNoteId = id;
	}

	async function deleteNote(id: number) {
		if (confirm('Hapus catatan keuangan ini?')) {
			await notes.delete(id);
			if (selectedNoteId === id) {
				selectedNoteId = null;
			}
		}
	}

	function getNoteFinancials(content: string) {
		return parseContent(content);
	}
</script>

<aside class="sidebar" class:collapsed={!isSidebarVisible}>
	<div class="sidebar-header">
		<button onclick={createNote} class="new-btn" title="Buat Catatan Baru (Ctrl+N)">
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>
			<span>Catatan Baru</span>
		</button>
		<button
			onclick={() => (isSidebarVisible = false)}
			class="toggle-btn"
			title="Tutup Sidebar (Ctrl+B)"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="lucide lucide-panel-left-close"
				><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path
					d="m16 15-3-3 3-3"
				/></svg
			>
		</button>
	</div>

	<!-- Searching & Date selection -->
	<div class="filters">
		<div class="search-wrapper">
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="search-icon"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
			<input type="text" bind:value={searchQuery} placeholder="Cari catatan..." class="search-input" />
		</div>

		<select bind:value={selectedMonth} class="month-select">
			<option value="all">Semua Bulan</option>
			{#each availableMonths as month}
				<option value={month}>
					{new Date(month + '-01').toLocaleDateString(undefined, {
						month: 'long',
						year: 'numeric'
					})}
				</option>
			{/each}
		</select>
	</div>

	<!-- Horizontal scrollable Tag directory -->
	{#if allTags.length > 0}
		<div class="tag-directory">
			<button 
				class="tag-dir-btn" 
				class:active={selectedTag === null}
				onclick={() => selectedTag = null}
			>
				Semua
			</button>
			{#each allTags as tag}
				<button 
					class="tag-dir-btn" 
					class:active={selectedTag === tag}
					onclick={() => selectedTag = tag}
				>
					#{tag}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Note lists scroll area -->
	<div class="note-list">
		{#if filteredNotes.length === 0}
			<div class="empty-list-state">
				<p>Tidak ada catatan</p>
			</div>
		{:else}
			{#each filteredNotes as note}
				{@const fin = getNoteFinancials(note.content)}
				<div
					class="note-item"
					class:active={selectedNoteId === note.id}
					onclick={() => (selectedNoteId = note.id!)}
					onkeydown={(e) => e.key === 'Enter' && (selectedNoteId = note.id!)}
					role="button"
					tabindex="0"
				>
					<div class="note-info">
						<div class="note-row-top">
							<span class="note-title">
								{note.title || 'Catatan Kosong'}
							</span>
							
							<!-- Small visual balance dot -->
							<span 
								class="balance-dot" 
								class:dot-income={fin.total > 0} 
								class:dot-expense={fin.total < 0}
								title={fin.total > 0 ? 'Surplus' : fin.total < 0 ? 'Defisit' : 'Seimbang / Kosong'}
							></span>
						</div>

						<div class="note-row-bottom">
							<span class="note-date">
								{new Date(note.updatedAt).toLocaleDateString(undefined, {
									month: 'short',
									day: 'numeric'
								})}
							</span>

							<!-- Tag tags display -->
							{#if note.tags && note.tags.length > 0}
								<div class="note-item-tags">
									{#each note.tags.slice(0, 2) as tag}
										<span class="note-item-tag">#{tag}</span>
									{/each}
									{#if note.tags.length > 2}
										<span class="note-item-tag">+{note.tags.length - 2}</span>
									{/if}
								</div>
							{/if}
						</div>
					</div>
					
					<button
						onclick={(e) => {
							e.stopPropagation();
							deleteNote(note.id!);
						}}
						class="delete-btn"
						title="Hapus Catatan"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
					</button>
				</div>
			{/each}
		{/if}
	</div>

	<Backup />
</aside>

<style>
	.sidebar {
		width: 280px;
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		background: var(--bg-glass);
		backdrop-filter: blur(10px);
		flex-shrink: 0;
		transition:
			width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
			margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
			border-right-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 5;
	}

	.sidebar.collapsed {
		width: 0;
		margin-left: -280px;
		border-right-color: transparent;
		overflow: hidden;
	}

	.sidebar-header {
		padding: 1.25rem 1rem;
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.new-btn {
		flex: 1;
		padding: 0.6rem 1rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
		color: var(--text-primary);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-weight: 600;
		font-size: 0.85rem;
	}

	.new-btn:hover {
		background: var(--selection);
		border-color: var(--accent);
		color: var(--accent-light);
		box-shadow: 0 0 10px var(--accent-glow);
	}

	.toggle-btn {
		background: none;
		border: 1px solid var(--border);
		color: var(--text-secondary);
		padding: 0.5rem;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.toggle-btn:hover {
		color: var(--text-primary);
		background: var(--bg-secondary);
		border-color: var(--accent);
	}

	@media (max-width: 600px) {
		.sidebar {
			position: absolute;
			z-index: 10;
			height: 100%;
			box-shadow: 4px 0 25px rgba(0, 0, 0, 0.6);
			left: 0;
			transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		}

		.sidebar.collapsed {
			transform: translateX(-100%);
			width: 280px;
			margin-left: 0;
			border-right: 1px solid var(--border);
		}
	}

	.filters {
		padding: 0 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		border-bottom: 1px solid var(--border-glass);
	}

	.search-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 10px;
		color: var(--text-tertiary);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.5rem 0.5rem 2rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text-primary);
		font-size: 0.85rem;
	}

	.month-select {
		padding: 0.5rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text-primary);
		font-size: 0.85rem;
		cursor: pointer;
	}

	/* Tag Directory scrollbar */
	.tag-directory {
		padding: 0.75rem 1rem;
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		border-bottom: 1px solid var(--border-glass);
		scrollbar-width: none; /* Firefox */
	}

	.tag-directory::-webkit-scrollbar {
		display: none; /* Safari / Chrome */
	}

	.tag-dir-btn {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		padding: 3px 10px;
		border-radius: 20px;
		font-size: 0.75rem;
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.2s ease;
		font-weight: 500;
	}

	.tag-dir-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}

	.tag-dir-btn.active {
		background: var(--accent-glow);
		color: var(--accent-light);
		border-color: var(--accent);
	}

	/* Note List */
	.note-list {
		flex: 1;
		overflow-y: auto;
	}

	.empty-list-state {
		padding: 2.5rem 1rem;
		text-align: center;
		color: var(--text-tertiary);
		font-size: 0.85rem;
	}

	.note-item {
		cursor: pointer;
		padding: 0.9rem 1rem;
		border-bottom: 1px solid var(--border-glass);
		display: flex;
		justify-content: space-between;
		align-items: center;
		outline: none;
		transition: all 0.2s ease;
		position: relative;
	}

	.note-item:hover {
		background-color: rgba(255, 255, 255, 0.02);
	}

	.active {
		background-color: var(--selection) !important;
	}

	.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--accent);
		box-shadow: 0 0 8px var(--accent-glow);
	}

	.note-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.note-row-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.note-title {
		font-weight: 600;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.9rem;
		flex: 1;
	}

	/* Indicator dots */
	.balance-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
		background: var(--text-tertiary);
	}

	.dot-income {
		background: var(--income);
		box-shadow: 0 0 6px var(--income);
	}

	.dot-expense {
		background: var(--expense);
		box-shadow: 0 0 6px var(--expense);
	}

	.note-row-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.note-date {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	.note-item-tags {
		display: flex;
		gap: 0.25rem;
		align-items: center;
	}

	.note-item-tag {
		font-size: 0.65rem;
		color: var(--accent-light);
		background: rgba(139, 92, 246, 0.1);
		padding: 1px 5px;
		border-radius: 4px;
		font-weight: 500;
	}

	.delete-btn {
		background: none;
		border: none;
		color: var(--text-tertiary);
		cursor: pointer;
		opacity: 0;
		transition: all 0.2s ease;
		padding: 4px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: 0.5rem;
	}

	.note-item:hover .delete-btn {
		opacity: 1;
	}

	.delete-btn:hover {
		color: var(--expense);
		background: var(--expense-bg);
	}
</style>
