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
			<div class="title-wrapper">
				<span class="cli-prompt-char">$ mv</span>
				<input
					type="text"
					bind:value={title}
					onfocus={() => (isTypingTitle = true)}
					onblur={() => (isTypingTitle = false)}
					oninput={debouncedSave}
					placeholder="judul_catatan"
					class="title-input"
				/>
				<span class="title-extension">.ledger</span>
			</div>
			
			<div class="tabs">
				<button 
					class="tab-btn" 
					class:active={activeTab === 'edit'} 
					onclick={() => activeTab = 'edit'}
					title="Tulis Catatan (GNU nano)"
				>
					<span>nano</span>
				</button>
				<button 
					class="tab-btn" 
					class:active={activeTab === 'visual'} 
					onclick={() => activeTab = 'visual'}
					title="Pratinjau Ledger (git diff)"
				>
					<span>git diff</span>
				</button>
			</div>
		</div>

		<!-- Tags Manager Row -->
		<div class="tags-bar">
			<div class="tags-list">
				<span class="tags-label">branches/tags:</span>
				{#if note.tags && note.tags.length > 0}
					{#each note.tags as tag}
						<span class="tag-pill">
							{tag}
							<button class="remove-tag" onclick={() => removeTag(tag)} title="Hapus tag">&times;</button>
						</span>
					{/each}
				{/if}
				<span class="new-tag-wrapper">
					<span class="tag-prefix">+</span>
					<input
						type="text"
						placeholder="new_tag..."
						bind:value={newTag}
						onkeydown={addTag}
						class="new-tag-input"
					/>
				</span>
			</div>
		</div>

		<!-- Workspace (Text Editor and Ledger Preview Split-View) -->
		<div class="workspace">
			<div class="split-view">
				<div class="split-pane pane-edit" class:hidden-mobile={activeTab !== 'edit'}>
					<div class="nano-header">
						<span class="nano-brand">GNU nano 8.0</span>
						<span class="nano-filename">{title ? `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.ledger` : 'untitled.ledger'}</span>
						<span class="nano-status">Modified</span>
					</div>
					<textarea
						bind:value={content}
						onfocus={() => (isTypingContent = true)}
						onblur={() => (isTypingContent = false)}
						oninput={debouncedSave}
						placeholder="Tulis transaksi di sini. Contoh:&#10;Gaji Pokok 5jt&#10;Beli Kopi -25k&#10;Bonus Project 2jt - 500k&#10;Belanja Bulanan -1.5m"
						class="content-area"
					></textarea>
					<div class="nano-footer">
						<div class="nano-shortcut">^G Get Help</div>
						<div class="nano-shortcut">^O Write Out</div>
						<div class="nano-shortcut">^W Where Is</div>
						<div class="nano-shortcut">^X Exit</div>
					</div>
				</div>
				
				<div class="split-pane pane-preview" class:hidden-mobile={activeTab !== 'visual'}>
					<div class="diff-header">
						<span class="diff-title">$ git diff --stat {title ? `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.ledger` : 'untitled.ledger'}</span>
					</div>
					<div class="ledger-preview">
						{#if parsed.lines.length === 0 || (parsed.lines.length === 1 && !parsed.lines[0].text.trim())}
							<div class="empty-ledger">
								<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 17h6M9 13h6M9 9h4" /></svg>
								<p>Ledger kosong. Mulai menulis catatan di panel nano!</p>
							</div>
						{:else}
							<div class="ledger-rows">
								{#each parsed.lines as line}
									{#if line.text.startsWith('# ')}
										<h2 class="ledger-h1"># {line.text.replace('# ', '')}</h2>
									{:else if line.text.startsWith('## ')}
										<h3 class="ledger-h2">## {line.text.replace('## ', '')}</h3>
									{:else if line.text.startsWith('### ')}
										<h4 class="ledger-h3">### {line.text.replace('### ', '')}</h4>
									{:else if line.value !== null}
										<div class="ledger-row" class:row-income={line.value > 0} class:row-expense={line.value < 0}>
											<span class="diff-prefix">{line.value > 0 ? '+' : '-'}</span>
											<div class="ledger-desc">
												{line.text || 'transaksi'}
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
											<span class="diff-prefix">&nbsp;</span>
											<span>{line.text}</span>
										</div>
									{:else}
										<div class="ledger-spacer"></div>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
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
		padding: 1rem 1.5rem 0.5rem;
		background: var(--bg-primary);
		width: 100%;
		height: 100%;
		font-family: 'JetBrains Mono', monospace;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.5rem;
		gap: 1.5rem;
	}

	.title-wrapper {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
	}

	.cli-prompt-char {
		color: #ff5c57; /* red/pink option prompt */
		font-weight: 700;
		font-size: 1.1rem;
		user-select: none;
	}

	.title-input {
		font-size: 1.1rem;
		font-weight: 700;
		border: none !important;
		background: transparent !important;
		padding: 0;
		color: var(--text-primary);
		outline: none !important;
		box-shadow: none !important;
		width: auto;
		flex: 1;
		font-family: 'JetBrains Mono', monospace;
	}

	.title-input::placeholder {
		color: var(--text-tertiary);
	}

	.title-extension {
		color: var(--text-tertiary);
		font-size: 1.1rem;
		font-weight: 700;
		user-select: none;
	}

	/* Tabs Styling */
	.tabs {
		display: flex;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		padding: 2px;
		border-radius: 6px;
		gap: 2px;
	}

	.tab-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 0.8rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		cursor: pointer;
		font-family: 'JetBrains Mono', monospace;
		transition: all 0.2s ease;
	}

	.tab-btn:hover {
		color: var(--text-primary);
	}

	.tab-btn.active {
		background: var(--bg-tertiary);
		color: var(--accent); /* green active tab */
		font-weight: 700;
	}

	/* Tags manager styling */
	.tags-bar {
		padding: 0.5rem 0;
		display: flex;
		align-items: center;
	}

	.tags-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
	}

	.tags-label {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin-right: 4px;
		user-select: none;
	}

	.tag-pill {
		font-size: 0.7rem;
		font-weight: 600;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		color: #ff9f43; /* orange tag */
		padding: 1px 6px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.remove-tag {
		background: none;
		border: none;
		color: var(--text-tertiary);
		font-size: 0.85rem;
		cursor: pointer;
		padding: 0;
		line-height: 1;
		font-weight: 700;
	}

	.remove-tag:hover {
		color: var(--expense);
	}

	.new-tag-wrapper {
		display: flex;
		align-items: center;
		gap: 2px;
		border: 1px dashed var(--border);
		border-radius: 4px;
		padding: 1px 6px;
		background: transparent;
	}

	.tag-prefix {
		color: var(--text-tertiary);
		font-size: 0.7rem;
		user-select: none;
	}

	.new-tag-input {
		font-size: 0.7rem;
		padding: 0;
		background: transparent !important;
		border: none !important;
		color: var(--text-secondary);
		width: 75px;
		outline: none !important;
		box-shadow: none !important;
		font-family: 'JetBrains Mono', monospace;
	}

	.new-tag-input:focus {
		width: 100px;
		color: var(--text-primary);
	}

	/* Workspace Split-View Layout */
	.workspace {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		margin-bottom: 0.5rem;
	}

	.split-view {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		height: 100%;
		min-height: 0;
	}

	.split-pane {
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--bg-secondary);
	}

	.pane-edit {
		display: flex;
		flex-direction: column;
	}

	.nano-header {
		background: var(--text-primary);
		color: var(--bg-primary);
		padding: 3px 8px;
		font-size: 0.75rem;
		display: flex;
		justify-content: space-between;
		font-weight: 700;
		border-radius: 3px 3px 0 0;
		user-select: none;
	}

	.content-area {
		flex: 1;
		width: 100%;
		border: none !important;
		background: transparent !important;
		resize: none;
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--text-primary);
		outline: none !important;
		box-shadow: none !important;
		padding: 0.75rem;
		font-family: 'JetBrains Mono', monospace;
	}

	.content-area::placeholder {
		color: var(--text-tertiary);
		opacity: 0.5;
	}

	.nano-footer {
		background: var(--bg-primary);
		border-top: 1px solid var(--border);
		padding: 4px 8px;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 4px;
		font-size: 0.7rem;
		border-radius: 0 0 3px 3px;
		user-select: none;
	}

	.nano-shortcut {
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Ledger Preview Panel */
	.diff-header {
		background: var(--bg-primary);
		border-bottom: 1px solid var(--border);
		color: var(--accent); /* green command */
		padding: 3px 8px;
		font-size: 0.75rem;
		font-weight: 700;
		border-radius: 3px 3px 0 0;
		user-select: none;
	}

	.ledger-preview {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem 0;
	}

	.empty-ledger {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: var(--text-tertiary);
		gap: 0.5rem;
	}

	.empty-ledger p {
		font-size: 0.8rem;
		margin: 0;
	}

	.ledger-rows {
		display: flex;
		flex-direction: column;
	}

	.ledger-row {
		display: flex;
		align-items: center;
		padding: 0.3rem 0.75rem;
		font-size: 0.85rem;
		line-height: 1.5;
	}

	.row-income {
		background: rgba(0, 255, 102, 0.06);
		color: #5af78e;
		border-left: 3px solid #00ff66;
	}

	.row-expense {
		background: rgba(255, 51, 102, 0.06);
		color: #ff5c57;
		border-left: 3px solid #ff3366;
	}

	.diff-prefix {
		font-weight: 700;
		margin-right: 8px;
		user-select: none;
	}

	.ledger-desc {
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex: 1;
	}

	.ledger-expr {
		font-size: 0.7rem;
		color: var(--text-tertiary);
	}

	.ledger-val {
		font-weight: 700;
		margin-left: auto;
	}

	.ledger-text-row {
		padding: 0.2rem 0.75rem;
		color: var(--text-secondary);
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		line-height: 1.5;
	}

	.ledger-h1 {
		font-size: 1.1rem;
		font-weight: 700;
		margin: 1rem 0 0.4rem 0;
		color: #57c7ff; /* blue/cyan title */
		border-bottom: 1px dashed var(--border);
		padding: 0 0.75rem 0.2rem;
	}

	.ledger-h2 {
		font-size: 0.95rem;
		font-weight: 600;
		margin: 0.8rem 0 0.3rem 0;
		color: #ff9f43; /* orange title */
		padding: 0 0.75rem;
	}

	.ledger-h3 {
		font-size: 0.85rem;
		font-weight: 600;
		margin: 0.6rem 0 0.2rem 0;
		color: var(--text-secondary);
		padding: 0 0.75rem;
	}

	.ledger-spacer {
		height: 0.75rem;
	}

	/* Responsive Splitting Rules */
	@media (max-width: 768px) {
		.split-view {
			grid-template-columns: 1fr;
			gap: 0;
		}

		.pane-edit {
			border: none;
		}

		.split-pane {
			border: 1px solid var(--border);
		}

		.hidden-mobile {
			display: none !important;
		}
	}

	@media (min-width: 769px) {
		.tabs {
			display: none; /* Hide tab toggles when both panes are side-by-side */
		}
	}

	@media (max-width: 600px) {
		.editor-container {
			padding: 0.75rem 1rem 0.5rem;
		}

		.editor-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
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
