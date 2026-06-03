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
		if (confirm('Hapus catatan keuangan ini? (git rm)')) {
			await notes.delete(id);
			if (selectedNoteId === id) {
				selectedNoteId = null;
			}
		}
	}

	function getNoteFinancials(content: string) {
		return parseContent(content);
	}

	function generateHash(id: number, updatedAt: number): string {
		const val = (id * 9876543 + updatedAt).toString(16);
		return val.substring(0, 7).padEnd(7, 'f');
	}
</script>

<aside class="sidebar" class:collapsed={!isSidebarVisible}>
	<div class="sidebar-header">
		<div class="repo-info">
			<span class="repo-label">repo:</span>
			<span class="repo-name">money-notes</span>
			<span class="branch-tag">[main]</span>
		</div>
		<button
			onclick={() => (isSidebarVisible = false)}
			class="toggle-btn"
			title="Tutup Sidebar (Ctrl+B)"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="lucide lucide-panel-left-close"
				><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path
					d="m16 15-3-3 3-3"
				/></svg>
		</button>
	</div>

	<!-- CLI Actions -->
	<div class="cli-actions">
		<button onclick={createNote} class="cli-action-btn" title="Buat Catatan Baru (touch)">
			<span>$ touch ledger.txt</span>
		</button>
	</div>

	<!-- Searching & Date selection -->
	<div class="filters">
		<div class="search-wrapper">
			<span class="cli-prompt-char">$ grep</span>
			<input type="text" bind:value={searchQuery} placeholder="Cari catatan..." class="search-input" />
		</div>

		<div class="filter-row">
			<span class="cli-prompt-char">--month=</span>
			<select bind:value={selectedMonth} class="month-select">
				<option value="all">all</option>
				{#each availableMonths as month}
					<option value={month}>
						{month}
					</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Horizontal scrollable Tag directory -->
	{#if allTags.length > 0}
		<div class="tag-directory">
			<span class="branch-icon-label">git checkout [branch]:</span>
			<div class="tag-scroll-row">
				<button 
					class="tag-dir-btn" 
					class:active={selectedTag === null}
					onclick={() => selectedTag = null}
				>
					main
				</button>
				{#each allTags as tag}
					<button 
						class="tag-dir-btn" 
						class:active={selectedTag === tag}
						onclick={() => selectedTag = tag}
					>
						{tag}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Note lists scroll area -->
	<div class="note-list">
		{#if filteredNotes.length === 0}
			<div class="empty-list-state">
				<p>No ledgers found</p>
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
							<span class="note-title" class:active-title={selectedNoteId === note.id}>
								{#if selectedNoteId === note.id}
									<span class="git-status-prefix-active">&gt;</span>
								{:else}
									<span class="git-status-prefix-inactive">&nbsp;</span>
								{/if}
								{note.title ? `${note.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.ledger` : 'untitled.ledger'}
							</span>
							
							<span class="note-balance-delta" class:pos={fin.total > 0} class:neg={fin.total < 0}>
								{fin.total > 0 ? '+' : ''}{formatCurrency(fin.total)}
							</span>
						</div>

						<div class="note-row-bottom">
							<span class="note-date">
								commit: {generateHash(note.id!, note.updatedAt)}
							</span>

							{#if note.tags && note.tags.length > 0}
								<div class="note-item-tags">
									{#each note.tags.slice(0, 2) as tag}
										<span class="note-item-tag">{tag}</span>
									{/each}
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
						title="git rm"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
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
		background: var(--bg-secondary);
		flex-shrink: 0;
		transition:
			width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
			margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
			border-right-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 5;
		font-family: 'JetBrains Mono', monospace;
	}

	.sidebar.collapsed {
		width: 0;
		margin-left: -280px;
		border-right-color: transparent;
		overflow: hidden;
	}

	.sidebar-header {
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--border);
	}

	.repo-info {
		font-size: 0.8rem;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.repo-label {
		color: var(--text-tertiary);
	}

	.repo-name {
		color: var(--text-primary);
		font-weight: 700;
	}

	.branch-tag {
		color: #ff9f43; /* orange branch style */
		font-weight: 700;
	}

	.cli-actions {
		padding: 0.75rem 1rem 0.5rem;
	}

	.cli-action-btn {
		width: 100%;
		background: var(--bg-primary);
		border: 1px solid var(--border);
		color: var(--accent); /* Terminal Green */
		padding: 8px 12px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.8rem;
		border-radius: 4px;
		text-align: left;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		font-weight: 700;
		transition: all 0.2s ease;
	}

	.cli-action-btn:hover {
		background: var(--bg-tertiary);
		color: var(--accent-light);
		border-color: var(--text-secondary);
	}

	.toggle-btn {
		background: none;
		border: 1px solid var(--border);
		color: var(--text-secondary);
		padding: 0.35rem;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.toggle-btn:hover {
		color: var(--text-primary);
		background: var(--bg-tertiary);
		border-color: var(--text-secondary);
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
		padding: 0.5rem 1rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border-bottom: 1px solid var(--border);
	}

	.search-wrapper {
		display: flex;
		align-items: center;
		background: var(--bg-primary);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 0 8px;
		gap: 6px;
		height: 32px;
	}

	.cli-prompt-char {
		color: #ff5c57; /* red/pink option */
		font-size: 0.8rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.search-input {
		background: transparent !important;
		border: none !important;
		padding: 0 !important;
		box-shadow: none !important;
		font-size: 0.8rem !important;
		width: 100%;
		font-family: 'JetBrains Mono', monospace;
	}

	.filter-row {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 32px;
	}

	.month-select {
		flex: 1;
		height: 100%;
		font-size: 0.8rem;
		padding: 0 6px;
		background: var(--bg-primary);
		border: 1px solid var(--border);
		border-radius: 4px;
		cursor: pointer;
		font-family: 'JetBrains Mono', monospace;
	}

	/* Tag Directory scrollbar */
	.tag-directory {
		padding: 0.75rem 1rem 0.5rem;
		border-bottom: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.branch-icon-label {
		font-size: 0.7rem;
		color: var(--text-tertiary);
	}

	.tag-scroll-row {
		display: flex;
		gap: 4px;
		overflow-x: auto;
		scrollbar-width: none; /* Firefox */
	}

	.tag-scroll-row::-webkit-scrollbar {
		display: none; /* Safari / Chrome */
	}

	.tag-dir-btn {
		background: var(--bg-primary);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 0.75rem;
		white-space: nowrap;
		cursor: pointer;
		font-family: 'JetBrains Mono', monospace;
		transition: all 0.2s ease;
	}

	.tag-dir-btn:hover {
		color: var(--text-primary);
		border-color: var(--text-secondary);
	}

	.tag-dir-btn.active {
		background: var(--accent);
		color: var(--bg-primary);
		border-color: var(--accent);
		font-weight: 700;
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
		font-size: 0.8rem;
	}

	.note-item {
		cursor: pointer;
		padding: 0.6rem 1rem;
		border-bottom: 1px solid var(--border);
		display: flex;
		justify-content: space-between;
		align-items: center;
		outline: none;
		transition: all 0.15s ease;
	}

	.note-item:hover {
		background-color: var(--bg-tertiary);
	}

	.note-item.active {
		background-color: var(--selection);
	}

	.note-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.note-row-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.git-status-prefix-active {
		color: var(--accent);
		font-weight: 700;
		margin-right: 2px;
	}

	.git-status-prefix-inactive {
		margin-right: 2px;
		color: transparent;
	}

	.note-title {
		font-weight: 500;
		color: var(--text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.8rem;
		flex: 1;
	}

	.note-title.active-title {
		color: var(--text-primary);
		font-weight: 700;
	}

	.note-balance-delta {
		font-size: 0.75rem;
		font-weight: 700;
	}

	.note-balance-delta.pos {
		color: var(--income);
	}

	.note-balance-delta.neg {
		color: var(--expense);
	}

	.note-row-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		padding-left: 12px;
	}

	.note-date {
		font-size: 0.65rem;
		color: var(--text-tertiary);
	}

	.note-item-tags {
		display: flex;
		gap: 0.25rem;
		align-items: center;
	}

	.note-item-tag {
		font-size: 0.6rem;
		color: #ff9f43;
		background: rgba(255, 159, 67, 0.1);
		border: 1px solid rgba(255, 159, 67, 0.2);
		padding: 0px 4px;
		border-radius: 2px;
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
		background: rgba(255, 51, 102, 0.1);
		border-color: var(--expense);
	}
</style>
