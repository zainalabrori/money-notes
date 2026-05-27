<script lang="ts">
	import { notes } from '../stores/notes';
	import { db, type Note } from '../db/dexie';
	import { liveQuery } from 'dexie';
	import { parseContent } from '../parser/note';
	import { formatCurrency } from '../utils/currency';
	import Summary from './Summary.svelte';

	let { noteId }: { noteId: number } = $props();

	let note = $state<Note | null>(null);
	let title = $state('');
	let content = $state('');
	let activeTab = $state<'edit' | 'visual'>('edit');
	let newTag = $state('');

	let parsed = $derived(parseContent(content));

	$effect(() => {
		// Reset states when switching notes
		const _ = noteId;
		isTypingTitle = false;
		isTypingContent = false;
		newTag = '';

		const query = liveQuery(() => db.notes.get(noteId));
		const subscription = query.subscribe((value) => {
			if (value) {
				const isNewNote = !note || note.id !== value.id;

				if (title !== value.title && (!isTypingTitle || isNewNote)) {
					title = value.title;
				}
				if (content !== value.content && (!isTypingContent || isNewNote)) {
					content = value.content;
				}

				note = value;
			}
		});
		return () => subscription.unsubscribe();
	});

	let isTypingTitle = false;
	let isTypingContent = false;

	async function handleInput() {
		if (noteId) {
			await notes.update(noteId, { title, content });
		}
	}

	let timeout: ReturnType<typeof setTimeout>;
	function debouncedSave() {
		clearTimeout(timeout);
		timeout = setTimeout(handleInput, 300);
	}

	async function addTag(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const tag = newTag.trim().toLowerCase();
			if (tag && note) {
				const tags = note.tags || [];
				if (!tags.includes(tag)) {
					const updatedTags = [...tags, tag];
					await notes.update(noteId, { tags: updatedTags });
				}
				newTag = '';
			}
		}
	}

	async function removeTag(tagToRemove: string) {
		if (note) {
			const tags = note.tags || [];
			const updatedTags = tags.filter((t) => t !== tagToRemove);
			await notes.update(noteId, { tags: updatedTags });
		}
	}
</script>

{#if note}
	<div class="editor-container">
		<!-- Header (Title & Mode Toggle) -->
		<div class="editor-header">
			<input
				type="text"
				bind:value={title}
				onfocus={() => (isTypingTitle = true)}
				onblur={() => (isTypingTitle = false)}
				oninput={debouncedSave}
				placeholder="Judul Catatan..."
				class="title-input"
			/>
			
			<div class="tabs">
				<button 
					class="tab-btn" 
					class:active={activeTab === 'edit'} 
					onclick={() => activeTab = 'edit'}
					title="Tulis Catatan Keuangan"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
					<span>Tulis</span>
				</button>
				<button 
					class="tab-btn" 
					class:active={activeTab === 'visual'} 
					onclick={() => activeTab = 'visual'}
					title="Lihat Pratinjau Visual Ledger"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20M9 12v9M15 12v9M4 4h16a2 2 0 0 1 2 2v4H2V6a2 2 0 0 1 2-2Z"/></svg>
					<span>Visual Ledger</span>
				</button>
			</div>
		</div>

		<!-- Tags Manager Row -->
		<div class="tags-bar">
			<div class="tags-list">
				{#if note.tags && note.tags.length > 0}
					{#each note.tags as tag}
						<span class="tag-pill">
							#{tag}
							<button class="remove-tag" onclick={() => removeTag(tag)} title="Hapus tag">&times;</button>
						</span>
					{/each}
				{/if}
				<input
					type="text"
					placeholder="+ Tambah tag..."
					bind:value={newTag}
					onkeydown={addTag}
					class="new-tag-input"
				/>
			</div>
		</div>

		<!-- Workspace (Text Editor or Ledger Preview) -->
		<div class="workspace">
			{#if activeTab === 'edit'}
				<textarea
					bind:value={content}
					onfocus={() => (isTypingContent = true)}
					onblur={() => (isTypingContent = false)}
					oninput={debouncedSave}
					placeholder="Tulis transaksi di sini. Contoh:&#10;Gaji Pokok 5jt&#10;Beli Kopi -25k&#10;Bonus Project 2jt - 500k&#10;Belanja Bulanan -1.5m"
					class="content-area"
				></textarea>
			{:else}
				<div class="ledger-preview">
					{#if parsed.lines.length === 0 || (parsed.lines.length === 1 && !parsed.lines[0].text.trim())}
						<div class="empty-ledger">
							<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 17h6M9 13h6M9 9h4" /></svg>
							<p>Ledger kosong. Mulai menulis catatan di tab Tulis!</p>
						</div>
					{:else}
						<div class="ledger-rows">
							{#each parsed.lines as line}
								{#if line.text.startsWith('# ')}
									<h2 class="ledger-h1">{line.text.replace('# ', '')}</h2>
								{:else if line.text.startsWith('## ')}
									<h3 class="ledger-h2">{line.text.replace('## ', '')}</h3>
								{:else if line.text.startsWith('### ')}
									<h4 class="ledger-h3">{line.text.replace('### ', '')}</h4>
								{:else if line.value !== null}
									<div class="ledger-row" class:row-income={line.value > 0} class:row-expense={line.value < 0}>
										<div class="ledger-desc">
											{#if line.text.startsWith('- ') || line.text.startsWith('* ')}
												<span class="bullet">&bull;</span>
												{line.text.substring(2)}
											{:else}
												{line.text || 'Transaksi'}
											{/if}
											{#if line.expression && line.expression.trim() !== line.value.toString()}
												<span class="ledger-expr">({line.expression})</span>
											{/if}
										</div>
										<div class="ledger-val">
											{line.value > 0 ? '+' : ''}{formatCurrency(line.value)}
										</div>
									</div>
								{:else if line.text.trim()}
									<div class="ledger-text-row">
										{#if line.text.startsWith('- ') || line.text.startsWith('* ')}
											<span class="bullet">&bull;</span>
											<span>{line.text.substring(2)}</span>
										{:else}
											<span>{line.text}</span>
										{/if}
									</div>
								{:else}
									<div class="ledger-spacer"></div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Footer Summary -->
		<Summary income={parsed.income} expense={parsed.expense} total={parsed.total} />
	</div>
{/if}

<style>
	.editor-container {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		padding: 1.5rem 2rem 0.5rem;
		background: var(--bg-primary);
		max-width: 900px;
		margin: 0 auto;
		width: 100%;
		height: 100%;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.75rem;
		gap: 1.5rem;
	}

	.title-input {
		font-size: 1.8rem;
		font-weight: 800;
		width: 100%;
		border: none !important;
		background: transparent !important;
		padding: 0;
		color: var(--text-primary);
		outline: none !important;
		box-shadow: none !important;
		letter-spacing: -0.02em;
	}

	.title-input::placeholder {
		color: var(--text-tertiary);
	}

	/* Tabs Styling */
	.tabs {
		display: flex;
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
		padding: 3px;
		border-radius: 10px;
		gap: 2px;
	}

	.tab-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		padding: 6px 12px;
		border-radius: 8px;
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.tab-btn:hover {
		color: var(--text-primary);
	}

	.tab-btn.active {
		background: var(--bg-secondary);
		color: var(--accent-light);
		box-shadow: var(--shadow-sm);
	}

	/* Tags manager styling */
	.tags-bar {
		padding: 0.75rem 0;
		display: flex;
		align-items: center;
	}

	.tags-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
	}

	.tag-pill {
		font-size: 0.75rem;
		font-weight: 600;
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
		color: var(--accent-light);
		padding: 3px 8px 3px 10px;
		border-radius: 20px;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		transition: all 0.2s ease;
	}

	.tag-pill:hover {
		border-color: var(--accent);
		box-shadow: 0 0 8px var(--accent-glow);
	}

	.remove-tag {
		background: none;
		border: none;
		color: var(--text-tertiary);
		font-size: 0.9rem;
		cursor: pointer;
		padding: 0;
		line-height: 1;
		font-weight: 700;
	}

	.remove-tag:hover {
		color: var(--expense);
	}

	.new-tag-input {
		font-size: 0.75rem;
		padding: 3px 8px;
		background: transparent;
		border: 1px dashed var(--border);
		border-radius: 20px;
		color: var(--text-secondary);
		width: 100px;
		outline: none;
	}

	.new-tag-input:focus {
		width: 140px;
		border-color: var(--accent);
		border-style: solid;
		box-shadow: 0 0 0 2px var(--accent-glow);
		color: var(--text-primary);
	}

	/* Workspace */
	.workspace {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		margin-bottom: 0.5rem;
	}

	.content-area {
		flex: 1;
		width: 100%;
		border: none !important;
		background: transparent !important;
		resize: none;
		font-size: 1.05rem;
		line-height: 1.7;
		color: var(--text-primary);
		outline: none !important;
		box-shadow: none !important;
		padding: 0.75rem 0;
		font-family: inherit;
	}

	.content-area::placeholder {
		color: var(--text-tertiary);
		opacity: 0.6;
	}

	/* Ledger Preview Panel */
	.ledger-preview {
		flex: 1;
		overflow-y: auto;
		padding: 0.75rem 0;
	}

	.empty-ledger {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: var(--text-tertiary);
		gap: 0.75rem;
	}

	.empty-ledger p {
		font-size: 0.9rem;
		margin: 0;
	}

	.ledger-rows {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.ledger-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.01);
		border: 1px solid var(--border-glass);
		border-radius: 8px;
		transition: all 0.2s ease;
	}

	.ledger-row:hover {
		background: rgba(255, 255, 255, 0.02);
		transform: translateX(2px);
	}

	.row-income {
		border-left: 3px solid var(--income);
	}

	.row-expense {
		border-left: 3px solid var(--expense);
	}

	.ledger-desc {
		font-weight: 500;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.95rem;
	}

	.bullet {
		color: var(--accent-light);
	}

	.ledger-expr {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	.ledger-val {
		font-family: 'JetBrains Mono', monospace;
		font-weight: 700;
		font-size: 1rem;
	}

	.row-income .ledger-val {
		color: var(--income);
		text-shadow: 0 0 8px var(--income-glow);
	}

	.row-expense .ledger-val {
		color: var(--expense);
		text-shadow: 0 0 8px var(--expense-glow);
	}

	.ledger-text-row {
		padding: 0.4rem 1rem;
		color: var(--text-secondary);
		font-size: 0.95rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		line-height: 1.6;
	}

	.ledger-h1 {
		font-size: 1.4rem;
		font-weight: 700;
		margin: 1.5rem 0 0.5rem 0;
		color: var(--text-primary);
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.3rem;
	}

	.ledger-h2 {
		font-size: 1.2rem;
		font-weight: 600;
		margin: 1.25rem 0 0.4rem 0;
		color: var(--text-primary);
	}

	.ledger-h3 {
		font-size: 1.05rem;
		font-weight: 600;
		margin: 1rem 0 0.3rem 0;
		color: var(--text-secondary);
	}

	.ledger-spacer {
		height: 1rem;
	}

	@media (max-width: 600px) {
		.editor-container {
			padding: 1rem 1rem 0.5rem;
		}

		.editor-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.tabs {
			width: 100%;
		}

		.tab-btn {
			flex: 1;
			justify-content: center;
		}
	}
</style>
