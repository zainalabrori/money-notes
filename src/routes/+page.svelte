<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import { notes } from '$lib/stores/notes';
	import { fade } from 'svelte/transition';

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
	<Sidebar bind:selectedNoteId bind:isSidebarVisible />

	{#if isSidebarVisible}
		<div class="sidebar-backdrop" onclick={toggleSidebar} role="none" transition:fade={{ duration: 150 }}></div>
	{/if}

	<main class="main-content" class:full-width={!isSidebarVisible}>
		<header class="top-bar">
			{#if !isSidebarVisible}
				<button class="sidebar-toggle-btn" onclick={toggleSidebar} title="Open Sidebar (Ctrl+B)" transition:fade={{ duration: 150 }}>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-panel-left-open"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>
				</button>
			{/if}
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
		height: 100dvh;
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

	.sidebar-toggle-btn {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		padding: 6px 10px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.sidebar-toggle-btn:hover {
		color: var(--text-primary);
		background: var(--bg-tertiary);
		border-color: var(--accent);
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

	.sidebar-backdrop {
		display: none;
	}

	@media (max-width: 600px) {
		.app-container {
			position: relative;
		}

		.sidebar-backdrop {
			display: block;
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			height: 100dvh;
			background: rgba(0, 0, 0, 0.4);
			backdrop-filter: blur(2px);
			z-index: 9;
		}
	}
</style>
