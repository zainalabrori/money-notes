<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import { notes } from '$lib/stores/notes';
	import { fade } from 'svelte/transition';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { onMount } from 'svelte';

	let selectedNoteId = $state<number | null>(null);
	let isSidebarVisible = $state(true);

	// VAPID public key for push notifications
	const VAPID_PUBLIC_KEY = 'BATdT0XptowqM-WId6iTVFR9Iyn6XmBJrrTO6CIjLZBGG5JQduihLUZYk40eXLlTHXgsRwPZq7l_u79dabmARF4';

	let isNotificationSupported = $state(false);
	let isSubscribed = $state(false);

	onMount(() => {
		// Check if the browser supports push notifications
		isNotificationSupported =
			'Notification' in window &&
			'serviceWorker' in navigator &&
			'PushManager' in window;

		if (isNotificationSupported) {
			(async () => {
				try {
					const reg = await navigator.serviceWorker.ready;
					const existing = await reg.pushManager.getSubscription();
					if (existing) {
						isSubscribed = true;
						// Keep the server subscription in sync
						fetch('/api/push/subscribe', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(existing)
						}).catch((err) => console.error('Sync subscription error:', err));
					}
				} catch (err) {
					console.error('Check subscription error:', err);
				}
			})();
		}
	});

	// Convert VAPID key from base64url to Uint8Array (required by Push API)
	async function urlBase64ToUint8Array(base64String: string) {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
		const rawData = window.atob(base64);
		const output = new Uint8Array(rawData.length);
		for (let i = 0; i < rawData.length; ++i) {
			output[i] = rawData.charCodeAt(i);
		}
		return output;
	}

	async function enableNotifications() {
		if (!isNotificationSupported) return;
		try {
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				alert('Izin notifikasi ditolak. Harap izinkan di pengaturan browser.');
				return;
			}
			const reg = await navigator.serviceWorker.ready;
			const subscription = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: await urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
			});
			const res = await fetch('/api/push/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(subscription)
			});
			if (res.ok) {
				isSubscribed = true;
			} else {
				throw new Error('Gagal mendaftar ke server');
			}
		} catch (err: any) {
			console.error('Enable notification error:', err);
			alert('Gagal mengaktifkan pengingat: ' + err.message);
		}
	}

	async function sendTestNotification() {
		try {
			const res = await fetch('/api/push/send-reminder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: 'Money Notes',
					body: 'Pengingat uji coba berhasil! 🎉'
				})
			});
			if (!res.ok) throw new Error('Gagal mengirim uji coba');
			console.log('Test notification sent');
		} catch (err: any) {
			console.error('Test notification error:', err);
			alert('Gagal kirim notifikasi: ' + err.message);
		}
	}

	// Auto-select most recent note; create one if none exist
	$effect(() => {
		const unsub = notes.subscribe((value) => {
			if (selectedNoteId === null && value.length > 0) {
				const sorted = [...value].sort((a, b) => b.updatedAt - a.updatedAt);
				selectedNoteId = sorted[0].id ?? null;
			} else if (value.length === 0) {
				notes.add().then((id) => { selectedNoteId = id; });
			}
		});
		return unsub;
	});

	function toggleSidebar() {
		isSidebarVisible = !isSidebarVisible;
	}

	async function handleKeydown(e: KeyboardEvent) {
		// Ctrl+N → new note
		if ((e.ctrlKey || e.altKey) && e.key === 'n') {
			e.preventDefault();
			selectedNoteId = await notes.add();
		}
		// Ctrl+B → toggle sidebar
		if (e.ctrlKey && e.key === 'b') {
			e.preventDefault();
			toggleSidebar();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app-container">
	<Sidebar bind:selectedNoteId bind:isSidebarVisible />

	<!-- Mobile backdrop: tap to close sidebar -->
	{#if isSidebarVisible}
		<div
			class="sidebar-backdrop"
			onclick={toggleSidebar}
			role="none"
			transition:fade={{ duration: 150 }}
		></div>
	{/if}

	<main class="main-content">
		<!-- Top bar: app name + action buttons -->
		<header class="top-bar">
			<!-- Sidebar toggle (visible only when sidebar is closed) -->
			{#if !isSidebarVisible}
				<button
					class="icon-btn"
					onclick={toggleSidebar}
					title="Buka daftar catatan (Ctrl+B)"
					transition:fade={{ duration: 150 }}
				>
					<!-- Hamburger / panel-open icon -->
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
						fill="none" stroke="currentColor" stroke-width="2.5"
						stroke-linecap="round" stroke-linejoin="round">
						<rect width="18" height="18" x="3" y="3" rx="2"/>
						<path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>
					</svg>
				</button>
			{/if}

			<!-- App branding -->
			<div class="brand">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
					fill="none" stroke="var(--accent)" stroke-width="2"
					stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2"/>
					<path d="M12 6v6l4 2"/>
				</svg>
				<span class="brand-name">Money Notes</span>
			</div>

			<div class="spacer"></div>

			<!-- Install app button (only shown when PWA install is available) -->
			{#if pwa.isInstallable}
				<button
					class="action-btn"
					onclick={() => pwa.install()}
					title="Pasang aplikasi"
					transition:fade={{ duration: 150 }}
				>
					Pasang App
				</button>
			{/if}

			<!-- Notification buttons -->
			{#if isNotificationSupported && !isSubscribed}
				<button
					class="action-btn"
					onclick={enableNotifications}
					title="Aktifkan pengingat harian"
					transition:fade={{ duration: 150 }}
				>
					🔔 Aktifkan Pengingat
				</button>
			{:else if isNotificationSupported && isSubscribed}
				<button
					class="action-btn secondary"
					onclick={sendTestNotification}
					title="Kirim notifikasi uji coba"
					transition:fade={{ duration: 150 }}
				>
					🔔 Uji Pengingat
				</button>
			{/if}
		</header>

		<!-- Editor area -->
		{#if selectedNoteId}
			<Editor noteId={selectedNoteId} />
		{:else}
			<div class="empty-state">
				<p>Memuat catatan...</p>
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

	/* ── Top bar ──────────────────────────────────────── */
	.top-bar {
		display: flex;
		align-items: center;
		padding: 0 1rem;
		height: 52px;
		border-bottom: 1px solid var(--border);
		background: var(--bg-secondary);
		gap: 0.75rem;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.brand-name {
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.spacer { flex: 1; }

	/* Generic icon-only button */
	.icon-btn {
		background: var(--bg-primary);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		padding: 6px 8px;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.icon-btn:hover {
		color: var(--text-primary);
		background: var(--bg-tertiary);
		border-color: var(--text-secondary);
	}

	/* Small labelled action button */
	.action-btn {
		background: var(--bg-primary);
		border: 1px solid var(--border);
		color: var(--accent);
		padding: 5px 12px;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		font-weight: 600;
		transition: all 0.2s;
	}

	.action-btn:hover {
		background: var(--bg-tertiary);
		border-color: var(--text-secondary);
	}

	.action-btn.secondary {
		color: var(--text-secondary);
	}

	/* ── Mobile backdrop ──────────────────────────────── */
	.sidebar-backdrop {
		display: none;
	}

	@media (max-width: 600px) {
		.sidebar-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.45);
			backdrop-filter: blur(2px);
			z-index: 9;
		}

		.action-btn {
			font-size: 0.75rem;
			padding: 4px 8px;
		}
	}

	/* ── Empty state ──────────────────────────────────── */
	.empty-state {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
</style>
