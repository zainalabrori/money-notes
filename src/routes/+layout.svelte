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
	<meta name="theme-color" content="#08080a" />
</svelte:head>

{@render children()}

<style>
	:global(:root) {
		--bg-primary: #08080a;
		--bg-secondary: #0f0f12;
		--bg-tertiary: #17171c;
		--bg-card: #0f0f12;
		--bg-glass: rgba(8, 8, 10, 0.9);
		--text-primary: #f0f0f5;
		--text-secondary: #a0a0ab;
		--text-tertiary: #52525b;
		--accent: #00ff66; /* Terminal green */
		--accent-light: #39ff14;
		--accent-glow: rgba(0, 255, 102, 0.05);
		--border: #222226;
		--border-glass: rgba(255, 255, 255, 0.03);
		--income: #00ff66;
		--income-bg: rgba(0, 255, 102, 0.04);
		--income-glow: rgba(0, 255, 102, 0);
		--expense: #ff3366;
		--expense-bg: rgba(255, 51, 102, 0.04);
		--expense-glow: rgba(255, 51, 102, 0);
		--selection: #1c1c24;
		--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
		--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.7);
		--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.8);
		--shadow-glow: 0 0 0 transparent;
	}

	:global(body) {
		margin: 0;
		background-color: var(--bg-primary);
		color: var(--text-primary);
		font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', Monaco, monospace;
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
