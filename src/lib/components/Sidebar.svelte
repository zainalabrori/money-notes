<script lang="ts">
	import { notes } from '../stores/notes';
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

	let filteredNotes = $derived(
		allNotes
			.filter((note) => {
				const matchesSearch =
					note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					note.content.toLowerCase().includes(searchQuery.toLowerCase());

				if (selectedMonth === 'all') return matchesSearch;

				const noteDate = new Date(note.createdAt);
				const monthKey = `${noteDate.getFullYear()}-${String(noteDate.getMonth() + 1).padStart(2, '0')}`;
				return matchesSearch && monthKey === selectedMonth;
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
		if (confirm('Delete this note?')) {
			await notes.delete(id);
			if (selectedNoteId === id) {
				selectedNoteId = null;
			}
		}
	}
</script>

<aside class="sidebar" class:collapsed={!isSidebarVisible}>
	<div class="sidebar-header">
		<button onclick={createNote} class="new-btn">
			<span>+</span> New Note
		</button>
		<button onclick={() => (isSidebarVisible = false)} class="toggle-btn" title="Close Sidebar (Ctrl+B)">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-panel-left-close"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>
		</button>
	</div>

	<div class="filters">
		<input type="text" bind:value={searchQuery} placeholder="Search..." class="search-input" />

		<select bind:value={selectedMonth} class="month-select">
			<option value="all">All Months</option>
			{#each availableMonths as month}
				<option value={month}>
					{new Date(month + '-01').toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
				</option>
			{/each}
		</select>
	</div>

	<div class="note-list">
		{#each filteredNotes as note}
			<div
				class="note-item"
				class:active={selectedNoteId === note.id}
				onclick={() => (selectedNoteId = note.id!)}
				onkeydown={(e) => e.key === 'Enter' && (selectedNoteId = note.id!)}
				role="button"
				tabindex="0"
			>
				<div class="note-info">
					<div class="note-title">
						{note.title || 'Untitled'}
					</div>
					<div class="note-date">
						{new Date(note.updatedAt).toLocaleDateString(undefined, {
							month: 'short',
							day: 'numeric'
						})}
					</div>
				</div>
				<button
					onclick={(e) => {
						e.stopPropagation();
						deleteNote(note.id!);
					}}
					class="delete-btn"
					title="Delete"
				>
					×
				</button>
			</div>
		{/each}
	</div>

	<Backup />
</aside>

<style>
	.sidebar {
		width: 260px;
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		background: var(--bg-primary);
		flex-shrink: 0;
		transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-right-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.sidebar.collapsed {
		width: 0;
		margin-left: -260px;
		border-right-color: transparent;
		overflow: hidden;
	}

	.sidebar-header {
		padding: 1rem;
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.new-btn {
		flex: 1;
		padding: 0.6rem;
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border: 1px solid var(--border);
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-weight: 600;
	}

	.toggle-btn {
		background: none;
		border: 1px solid var(--border);
		color: var(--text-secondary);
		padding: 0.5rem;
		border-radius: 6px;
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

	.new-btn span {
		font-size: 1.2rem;
		line-height: 1;
	}

	.new-btn:hover {
		background: var(--selection);
		border-color: var(--accent);
	}

	@media (max-width: 600px) {
		.sidebar {
			position: absolute;
			z-index: 10;
			height: 100%;
			box-shadow: 4px 0 15px rgba(0, 0, 0, 0.5);
			left: 0;
			transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		}

		.sidebar.collapsed {
			transform: translateX(-100%);
			width: 260px;
			margin-left: 0;
			border-right: 1px solid var(--border);
		}
	}

	.filters {
		padding: 0 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.search-input,
	.month-select {
		padding: 0.5rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--text-primary);
		font-size: 0.85rem;
	}

	.note-list {
		flex: 1;
		overflow-y: auto;
		border-top: 1px solid var(--border);
	}

	.note-item {
		cursor: pointer;
		padding: 0.8rem 1rem;
		border-bottom: 1px solid var(--border);
		display: flex;
		justify-content: space-between;
		align-items: center;
		outline: none;
	}

	.note-item:hover {
		background-color: var(--bg-secondary);
	}

	.active {
		background-color: var(--selection);
		border-left: 3px solid var(--accent);
	}

	.note-info {
		flex: 1;
		min-width: 0;
	}

	.note-title {
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin-bottom: 0.2rem;
		font-size: 0.95rem;
	}

	.note-date {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.delete-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 1.2rem;
		padding: 0 0.5rem;
		opacity: 0;
	}

	.note-item:hover .delete-btn {
		opacity: 1;
	}

	.delete-btn:hover {
		color: var(--expense);
	}
</style>
