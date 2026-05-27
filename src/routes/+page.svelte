<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Dashboard from '$lib/components/Dashboard.svelte';
	import { notes } from '$lib/stores/notes';
	import { fade } from 'svelte/transition';
	import { pwa } from '$lib/stores/pwa.svelte';

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
		<div
			class="sidebar-backdrop"
			onclick={toggleSidebar}
			role="none"
			transition:fade={{ duration: 150 }}
		></div>
	{/if}

	<main class="main-content" class:full-width={!isSidebarVisible}>
		<header class="top-bar">
			{#if !isSidebarVisible}
				<button
					class="sidebar-toggle-btn"
					onclick={toggleSidebar}
					title="Open Sidebar (Ctrl+B)"
					transition:fade={{ duration: 150 }}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-panel-left-open"
						><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path
							d="m14 9 3 3-3 3"
						/></svg
					>
				</button>
			{/if}
			
			<div class="brand-logo" onclick={() => selectedNoteId = null} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (selectedNoteId = null)}>
				<div class="logo-mark">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
				</div>
				<span class="placeholder-text">Money Notes</span>
			</div>

			<div class="spacer"></div>

			{#if pwa.isInstallable}
				<button
					class="install-btn"
					onclick={() => pwa.install()}
					title="Install App"
					transition:fade={{ duration: 150 }}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-download"
						><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
							points="7 10 12 15 17 10"
						/><line x1="12" x2="12" y1="15" y2="3" /></svg
					>
					<span>Install App</span>
				</button>
			{/if}
		</header>

		{#if selectedNoteId}
			<Editor noteId={selectedNoteId} />
		{:else}
			<Dashboard bind:selectedNoteId />
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

	.brand-logo {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		cursor: pointer;
		outline: none;
		user-select: none;
	}

	.logo-mark {
		width: 28px;
		height: 28px;
		background: linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%);
		color: white;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(139, 92, 246, 0.25);
	}

	.placeholder-text {
		color: var(--text-primary);
		font-weight: 700;
		font-size: 0.95rem;
		letter-spacing: -0.01em;
	}
	.sidebar-backdrop {
		display: none;
	}

	.spacer {
		flex: 1;
	}

	.install-btn {
		background: linear-gradient(
			135deg,
			rgba(187, 134, 252, 0.1) 0%,
			rgba(187, 134, 252, 0.05) 100%
		);
		border: 1px dashed var(--accent);
		color: var(--accent);
		padding: 6px 12px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 0 8px rgba(187, 134, 252, 0.1);
	}

	.install-btn:hover {
		background: linear-gradient(135deg, rgba(187, 134, 252, 0.2) 0%, rgba(187, 134, 252, 0.1) 100%);
		border-style: solid;
		box-shadow: 0 0 12px rgba(187, 134, 252, 0.25);
		transform: translateY(-1px);
	}

	.install-btn:active {
		transform: translateY(0);
	}

	@media (max-width: 480px) {
		.install-btn span {
			display: none;
		}
		.install-btn {
			padding: 6px 8px;
		}
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
