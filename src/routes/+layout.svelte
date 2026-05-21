<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#121212" />
</svelte:head>

{@render children()}

<style>
	:global(:root) {
		--bg-primary: #121212;
		--bg-secondary: #1e1e1e;
		--bg-tertiary: #2d2d2d;
		--text-primary: #e0e0e0;
		--text-secondary: #a0a0a0;
		--accent: #bb86fc;
		--border: #333333;
		--income: #81c784;
		--expense: #e57373;
		--selection: #3d3d3d;
	}

	:global(body) {
		margin: 0;
		background-color: var(--bg-primary);
		color: var(--text-primary);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		-webkit-tap-highlight-color: transparent;
		overflow: hidden;
		line-height: 1.5;
	}

	:global(*) {
		box-sizing: border-box;
		/* No animations for speed */
		transition: none !important;
	}

	:global(input, textarea, select, button) {
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border);
		font-family: inherit;
		font-size: 1rem;
	}

	:global(input:focus, textarea:focus, select:focus) {
		outline: 1px solid var(--accent);
		border-color: var(--accent);
	}

	:global(button) {
		cursor: pointer;
		font-weight: 500;
	}

	:global(button:active) {
		background: var(--bg-tertiary);
	}

	/* Minimal scrollbar */
	:global(::-webkit-scrollbar) {
		width: 6px;
	}
	:global(::-webkit-scrollbar-track) {
		background: var(--bg-primary);
	}
	:global(::-webkit-scrollbar-thumb) {
		background: var(--border);
	}
</style>
