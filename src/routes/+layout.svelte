<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { pwaInfo } from 'virtual:pwa-info';

	let { children } = $props();

	let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	onMount(() => {
		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			pwa.setPrompt(e);
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{@html webManifestLink}
	<meta name="theme-color" content="#121212" />
</svelte:head>

{@render children()}

<style>
	:global(:root) {
		--bg-primary: #0b0f19;
		--bg-secondary: #121826;
		--bg-tertiary: #1b2336;
		--bg-card: rgba(18, 24, 38, 0.7);
		--bg-glass: rgba(11, 15, 25, 0.75);
		--text-primary: #f3f4f6;
		--text-secondary: #9ca3af;
		--text-tertiary: #6b7280;
		--accent: #8b5cf6;
		--accent-light: #a78bfa;
		--accent-glow: rgba(139, 92, 246, 0.15);
		--border: #242f47;
		--border-glass: rgba(255, 255, 255, 0.06);
		--income: #10b981;
		--income-bg: rgba(16, 185, 129, 0.1);
		--income-glow: rgba(16, 185, 129, 0.15);
		--expense: #f43f5e;
		--expense-bg: rgba(244, 63, 94, 0.1);
		--expense-glow: rgba(244, 63, 94, 0.15);
		--selection: #1e293b;
		--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
		--shadow-glow: 0 0 20px rgba(139, 92, 246, 0.1);
	}

	:global(body) {
		margin: 0;
		background-color: var(--bg-primary);
		color: var(--text-primary);
		font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		-webkit-tap-highlight-color: transparent;
		overflow: hidden;
		line-height: 1.5;
		letter-spacing: -0.01em;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(input, textarea, select, button) {
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border);
		font-family: inherit;
		font-size: 1rem;
		border-radius: 8px;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global(input:focus, textarea:focus, select:focus) {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-glow);
	}

	:global(button) {
		cursor: pointer;
		font-weight: 600;
	}

	:global(button:active) {
		transform: scale(0.98);
	}

	/* Minimal scrollbar */
	:global(::-webkit-scrollbar) {
		width: 6px;
		height: 6px;
	}
	:global(::-webkit-scrollbar-track) {
		background: var(--bg-primary);
	}
	:global(::-webkit-scrollbar-thumb) {
		background: var(--border);
		border-radius: 10px;
	}
	:global(::-webkit-scrollbar-thumb:hover) {
		background: var(--text-tertiary);
	}
</style>
