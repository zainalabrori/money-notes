<script lang="ts">
	import { notes } from '../stores/notes';
	import { db, type Note } from '../db/dexie';
	import { liveQuery } from 'dexie';
	import { parseContent } from '../parser/note';
	import { formatCurrency } from '../utils/currency';
	import Summary from './Summary.svelte';

	let { noteId }: { noteId: number } = $props();

	let note    = $state<Note | null>(null);
	let title   = $state('');
	let content = $state('');
	let activeTab = $state<'write' | 'preview'>('write');
	let newTag  = $state('');

	// Re-parse whenever content changes
	let parsed = $derived(parseContent(content));

	// Live-sync note from IndexedDB; only overwrite local state when not actively typing
	let isTypingTitle   = false;
	let isTypingContent = false;

	$effect(() => {
		const _ = noteId; // re-run when note switches
		isTypingTitle = false;
		isTypingContent = false;
		newTag = '';

		const query = liveQuery(() => db.notes.get(noteId));
		const sub = query.subscribe((value) => {
			if (!value) return;
			const isNew = !note || note.id !== value.id;
			if (title !== value.title   && (!isTypingTitle   || isNew)) title   = value.title;
			if (content !== value.content && (!isTypingContent || isNew)) content = value.content;
			note = value;
		});
		return () => sub.unsubscribe();
	});

	// Debounced auto-save (300 ms after last keystroke)
	let saveTimeout: ReturnType<typeof setTimeout>;
	async function debouncedSave() {
		clearTimeout(saveTimeout);
		saveTimeout = setTimeout(async () => {
			if (noteId) {
				await notes.update(noteId, { title, content });
				console.log('[money-notes] Auto-saved note', noteId);
			}
		}, 300);
	}

	// Tag management
	async function addTag(e: KeyboardEvent) {
		if (e.key !== 'Enter') return;
		e.preventDefault();
		const tag = newTag.trim().toLowerCase();
		if (tag && note && !(note.tags ?? []).includes(tag)) {
			await notes.update(noteId, { tags: [...(note.tags ?? []), tag] });
			console.log('[money-notes] Tag added:', tag);
		}
		newTag = '';
	}

	async function removeTag(tagToRemove: string) {
		if (!note) return;
		await notes.update(noteId, {
			tags: (note.tags ?? []).filter((t) => t !== tagToRemove)
		});
		console.log('[money-notes] Tag removed:', tagToRemove);
	}
</script>

{#if note}
<div class="editor-container">

	<!-- ── Header: title + tab toggle ──────────────── -->
	<div class="editor-header">
		<input
			type="text"
			bind:value={title}
			onfocus={() => (isTypingTitle = true)}
			onblur={() => (isTypingTitle = false)}
			oninput={debouncedSave}
			placeholder="Judul catatan..."
			class="title-input"
		/>

		<!-- Tab toggle (mobile: show one pane at a time) -->
		<div class="tabs">
			<button
				class="tab-btn"
				class:active={activeTab === 'write'}
				onclick={() => (activeTab = 'write')}
				title="Tulis catatan"
			>Tulis</button>
			<button
				class="tab-btn"
				class:active={activeTab === 'preview'}
				onclick={() => (activeTab = 'preview')}
				title="Lihat ringkasan"
			>Ringkasan</button>
		</div>
	</div>

	<!-- ── Tag bar ──────────────────────────────────── -->
	<div class="tags-bar">
		{#if note.tags && note.tags.length > 0}
			{#each note.tags as tag}
				<span class="tag-chip">
					{tag}
					<button class="remove-tag" onclick={() => removeTag(tag)} title="Hapus label">×</button>
				</span>
			{/each}
		{/if}
		<div class="new-tag-box">
			<input
				type="text"
				placeholder="+ Label baru..."
				bind:value={newTag}
				onkeydown={addTag}
				class="new-tag-input"
			/>
		</div>
	</div>

	<!-- ── Workspace: write + preview ──────────────── -->
	<div class="workspace">
		<div class="split-view">

			<!-- Write pane -->
			<div class="pane pane-write" class:hidden-mobile={activeTab !== 'write'}>
				<div class="pane-header">Tulis Transaksi</div>
				<textarea
					bind:value={content}
					onfocus={() => (isTypingContent = true)}
					onblur={() => (isTypingContent = false)}
					oninput={debouncedSave}
					placeholder="Contoh:&#10;Gaji 5jt&#10;Beli kopi -25k&#10;Bonus 2jt - 500k&#10;Belanja bulanan -1.5m"
					class="textarea"
				></textarea>
				<!-- Hint for new users -->
				<div class="write-hint">
					Tulis nama transaksi lalu angkanya. Gunakan <strong>–</strong> untuk pengeluaran.<br>
					Satuan: <code>k</code> = ribu &nbsp;·&nbsp; <code>jt</code> atau <code>m</code> = juta
				</div>
			</div>

			<!-- Preview pane -->
			<div class="pane pane-preview" class:hidden-mobile={activeTab !== 'preview'}>
				<div class="pane-header">Rincian Transaksi</div>
				<div class="preview-scroll">
					{#if parsed.lines.length === 0 || (parsed.lines.length === 1 && !parsed.lines[0].text.trim())}
						<div class="preview-empty">
							<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
								fill="none" stroke="currentColor" stroke-width="1.5"
								stroke-linecap="round" stroke-linejoin="round">
								<rect width="18" height="18" x="3" y="3" rx="2"/>
								<path d="M9 17h6M9 13h6M9 9h4"/>
							</svg>
							<p>Belum ada transaksi.<br>Mulai menulis di panel sebelah!</p>
						</div>
					{:else}
						<div class="preview-rows">
							{#each parsed.lines as line}
								{#if line.text.startsWith('# ')}
									<h2 class="preview-h1">{line.text.replace('# ', '')}</h2>
								{:else if line.text.startsWith('## ')}
									<h3 class="preview-h2">{line.text.replace('## ', '')}</h3>
								{:else if line.text.startsWith('### ')}
									<h4 class="preview-h3">{line.text.replace('### ', '')}</h4>
								{:else if line.value !== null}
									<div class="preview-row"
										class:row-income={line.value > 0}
										class:row-expense={line.value < 0}>
										<div class="row-label">
											<!-- +/– icon -->
											<span class="row-sign">{line.value > 0 ? '▲' : '▼'}</span>
											<span class="row-desc">
												{line.text || 'Transaksi'}
												{#if line.expression && line.expression.trim() !== line.value.toString()}
													<span class="row-expr">({line.expression})</span>
												{/if}
											</span>
										</div>
										<span class="row-amount">
											{line.value > 0 ? '+' : ''}{formatCurrency(line.value)}
										</span>
									</div>
								{:else if line.text.trim()}
									<div class="preview-text">{line.text}</div>
								{:else}
									<div class="preview-gap"></div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			</div>

		</div>
	</div>

	<!-- ── Summary footer ───────────────────────────── -->
	<Summary income={parsed.income} expense={parsed.expense} total={parsed.total} />

</div>
{/if}

<style>
	.editor-container {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		padding: 1rem 1.25rem 0.5rem;
		background: var(--bg-primary);
		height: 100%;
	}

	/* ── Header ─────────────────────────────────────── */
	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.6rem;
		gap: 1rem;
	}

	.title-input {
		font-size: 1.15rem;
		font-weight: 700;
		border: none !important;
		background: transparent !important;
		box-shadow: none !important;
		padding: 0;
		outline: none !important;
		color: var(--text-primary);
		flex: 1;
	}

	.title-input::placeholder { color: var(--text-tertiary); }

	/* Tab toggle */
	.tabs {
		display: flex;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 2px;
		gap: 2px;
	}

	.tab-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		padding: 4px 12px;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}

	.tab-btn:hover    { color: var(--text-primary); }
	.tab-btn.active   { background: var(--bg-tertiary); color: var(--accent); }

	/* ── Tags bar ────────────────────────────────────── */
	.tags-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		padding: 0.5rem 0;
	}

	.tag-chip {
		display: flex;
		align-items: center;
		gap: 4px;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		color: #fb923c;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.remove-tag {
		background: none;
		border: none;
		color: var(--text-tertiary);
		font-size: 1rem;
		line-height: 1;
		padding: 0;
		cursor: pointer;
	}
	.remove-tag:hover { color: var(--expense); }

	.new-tag-box {
		border: 1px dashed var(--border);
		border-radius: 999px;
		padding: 2px 10px;
	}

	.new-tag-input {
		font-size: 0.75rem;
		background: transparent !important;
		border: none !important;
		box-shadow: none !important;
		padding: 0 !important;
		outline: none !important;
		color: var(--text-secondary);
		width: 100px;
	}

	/* ── Workspace ───────────────────────────────────── */
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
		gap: 1rem;
		height: 100%;
		min-height: 0;
	}

	.pane {
		display: flex;
		flex-direction: column;
		min-height: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--bg-secondary);
		overflow: hidden;
	}

	.pane-header {
		padding: 8px 12px;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-tertiary);
		border-bottom: 1px solid var(--border);
		background: var(--bg-primary);
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	/* Write pane */
	.textarea {
		flex: 1;
		border: none !important;
		background: transparent !important;
		box-shadow: none !important;
		outline: none !important;
		resize: none;
		padding: 0.75rem;
		font-size: 0.92rem;
		line-height: 1.7;
		color: var(--text-primary);
		border-radius: 0 !important;
	}

	.textarea::placeholder { color: var(--text-tertiary); opacity: 0.6; }

	.write-hint {
		padding: 8px 12px;
		font-size: 0.7rem;
		color: var(--text-tertiary);
		border-top: 1px solid var(--border);
		line-height: 1.5;
	}

	.write-hint strong { color: var(--text-secondary); }
	.write-hint code   { color: var(--accent); font-family: monospace; }

	/* Preview pane */
	.preview-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 0.4rem 0;
	}

	.preview-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 160px;
		color: var(--text-tertiary);
		gap: 0.5rem;
		text-align: center;
	}

	.preview-empty p { font-size: 0.8rem; margin: 0; line-height: 1.5; }

	.preview-rows { display: flex; flex-direction: column; }

	.preview-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 6px 12px;
		font-size: 0.85rem;
	}

	.row-income  { background: rgba(52,211,153,.06); border-left: 3px solid var(--income); }
	.row-expense { background: rgba(248,113,113,.06); border-left: 3px solid var(--expense); }

	.row-label {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
		min-width: 0;
	}

	.row-sign {
		font-size: 0.6rem;
		color: inherit;
		flex-shrink: 0;
	}

	.row-income  .row-sign { color: var(--income); }
	.row-expense .row-sign { color: var(--expense); }

	.row-desc {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.row-expr {
		font-size: 0.7rem;
		color: var(--text-tertiary);
		flex-shrink: 0;
	}

	.row-amount {
		font-weight: 700;
		margin-left: auto;
		padding-left: 8px;
		white-space: nowrap;
	}

	.row-income  .row-amount { color: var(--income); }
	.row-expense .row-amount { color: var(--expense); }

	/* Headings inside preview */
	.preview-h1 {
		font-size: 1rem;
		font-weight: 700;
		margin: 1rem 12px 0.3rem;
		color: #60a5fa;
		border-bottom: 1px solid var(--border);
		padding-bottom: 4px;
	}

	.preview-h2 {
		font-size: 0.88rem;
		font-weight: 600;
		margin: 0.75rem 12px 0.25rem;
		color: #fb923c;
	}

	.preview-h3 {
		font-size: 0.8rem;
		font-weight: 600;
		margin: 0.5rem 12px 0.2rem;
		color: var(--text-secondary);
	}

	.preview-text {
		padding: 3px 12px;
		font-size: 0.82rem;
		color: var(--text-secondary);
	}

	.preview-gap { height: 10px; }

	/* ── Responsive ──────────────────────────────────── */
	@media (max-width: 768px) {
		.split-view {
			grid-template-columns: 1fr;
		}

		.hidden-mobile { display: none !important; }
	}

	@media (min-width: 769px) {
		/* Both panes shown on desktop; hide the tab toggle */
		.tabs { display: none; }
	}

	@media (max-width: 600px) {
		.editor-container { padding: 0.75rem 0.9rem 0.5rem; }

		.editor-header {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.tabs { width: 100%; }
		.tab-btn { flex: 1; justify-content: center; }
	}
</style>
