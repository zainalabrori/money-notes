<script lang="ts">
	import { notes } from '../stores/notes';
	import { db, type Note } from '../db/dexie';
	import { liveQuery } from 'dexie';
	import { parseContent } from '../parser/note';
	import Summary from './Summary.svelte';

	let { noteId }: { noteId: number } = $props();

	let note = $state<Note | null>(null);
	let title = $state('');
	let content = $state('');

	let parsed = $derived(parseContent(content));

	$effect(() => {
		// Reset typing flags when switching notes to prevent "stuck" state
		const _ = noteId; 
		isTypingTitle = false;
		isTypingContent = false;

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
		timeout = setTimeout(handleInput, 300); // Faster debounce
	}
</script>

{#if note}
	<div class="editor-container">
		<input
			type="text"
			bind:value={title}
			onfocus={() => (isTypingTitle = true)}
			onblur={() => (isTypingTitle = false)}
			oninput={debouncedSave}
			placeholder="Title"
			class="title-input"
		/>
		<textarea
			bind:value={content}
			onfocus={() => (isTypingContent = true)}
			onblur={() => (isTypingContent = false)}
			oninput={debouncedSave}
			placeholder="Start writing..."
			class="content-area"
		></textarea>
		<Summary income={parsed.income} expense={parsed.expense} total={parsed.total} />
	</div>
{/if}

<style>
	.editor-container {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		padding: 1.5rem 2rem;
		background: var(--bg-primary);
		max-width: 900px;
		margin: 0 auto;
		width: 100%;
	}

	.title-input {
		font-size: 1.8rem;
		font-weight: 700;
		width: 100%;
		border: none !important;
		background: transparent !important;
		padding: 0 0 1rem 0;
		color: var(--text-primary);
		outline: none !important;
	}

	.content-area {
		flex: 1;
		width: 100%;
		border: none !important;
		background: transparent !important;
		resize: none;
		font-size: 1.1rem;
		line-height: 1.6;
		color: var(--text-primary);
		outline: none !important;
		padding-top: 0.5rem;
	}

	.content-area::placeholder {
		color: var(--text-secondary);
		opacity: 0.5;
	}

	@media (max-width: 600px) {
		.editor-container {
			padding: 1rem;
		}
	}
</style>
