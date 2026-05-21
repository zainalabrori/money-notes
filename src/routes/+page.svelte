<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import { notes } from '$lib/stores/notes';

	let selectedNoteId = $state<number | null>(null);
	let isSidebarVisible = $state(true);

	function toggleSidebar() {
		isSidebarVisible = !isSidebarVisible;
	}

	async function handleKeydown(e: KeyboardEvent) {
		// Ctrl+N or Alt+N for New Note
		if ((e.ctrlKey || e.altKey) && e.key === 'n') {
			e.preventDefault();
			const id = await notes.add();
			selectedNoteId = id;
		}
		// Ctrl+B to toggle sidebar
		if (e.ctrlKey && e.key === 'b') {
			e.preventDefault();
			toggleSidebar();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app-container">
	{#if isSidebarVisible}
		<Sidebar bind:selectedNoteId />
	{/if}

	<main class="main-content" class:full-width={!isSidebarVisible}>
		<header class="top-bar">
			<button class="icon-btn" onclick={toggleSidebar} title="Toggle Sidebar (Ctrl+B)">
				{isSidebarVisible ? '←' : '→'}
			</button>
			{#if !selectedNoteId}
				<span class="placeholder-text">Money Notes</span>
			{/if}
		</header>

		{#if selectedNoteId}
			<Editor noteId={selectedNoteId} />
		{:else}
			<div class="empty-state">
				<p>Select a note or press <code>Ctrl+N</code></p>
			</div>
		{/if}
	</main>
</div>

<style>
	.app-container {
		display: flex;
		height: 100vh;
		background: var(--bg-primary);
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.top-bar {
		display: flex;
		align-items: center;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--border);
		gap: 1rem;
		height: 48px;
	}

	.icon-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 1.2rem;
		padding: 4px 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
	}

	.icon-btn:hover {
		color: var(--text-primary);
		background: var(--bg-secondary);
	}

	.placeholder-text {
		color: var(--text-secondary);
		font-weight: 600;
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.empty-state {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		flex-direction: column;
		gap: 1rem;
	}

	code {
		background: var(--bg-secondary);
		padding: 2px 6px;
		border-radius: 4px;
		border: 1px solid var(--border);
		color: var(--accent);
	}

	@media (max-width: 600px) {
		.app-container {
			position: relative;
		}

		:global(.sidebar) {
			position: absolute;
			z-index: 10;
			height: 100%;
			box-shadow: 4px 0 15px rgba(0, 0, 0, 0.5);
		}
	}
</style>
