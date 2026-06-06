<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { pwaInfo } from 'virtual:pwa-info';

	let { children } = $props();

	let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	onMount(() => {
		if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
			import('virtual:pwa-register').then(({ registerSW }) => {
				registerSW({ immediate: true });
			});
		}

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
	/* ─── Design Tokens ─────────────────────────────────────── */
	:global(:root) {
		--bg-primary: #08080a;
		--bg-secondary: #0f0f12;
		--bg-tertiary: #17171c;
		--text-primary: #f0f0f5;
		--text-secondary: #a0a0ab;
		--text-tertiary: #52525b;

		/* Accent: a calm teal instead of harsh terminal-green */
		--accent: #34d399;
		--accent-glow: rgba(52, 211, 153, 0.08);

		--border: #222226;
		--selection: #1c1c24;

		--income: #34d399; /* soft green  */
		--expense: #f87171; /* soft red    */

		--radius-sm: 6px;
		--radius-md: 10px;
	}

	/* ─── Reset & Base ──────────────────────────────────────── */
	:global(body) {
		margin: 0;
		background-color: var(--bg-primary);
		color: var(--text-primary);
		/* Use a readable sans-serif for general audience */
		font-family:
			'Inter',
			'Segoe UI',
			system-ui,
			-apple-system,
			sans-serif;
		-webkit-tap-highlight-color: transparent;
		overflow: hidden;
		line-height: 1.6;
	}

	:global(*) {
		box-sizing: border-box;
	}

	/* ─── Form Elements ─────────────────────────────────────── */
	:global(input, textarea, select, button) {
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border);
		font-family: inherit;
		font-size: 1rem;
		border-radius: var(--radius-sm);
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
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

	/* ─── Scrollbar ─────────────────────────────────────────── */
	:global(::-webkit-scrollbar) {
		width: 5px;
		height: 5px;
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
