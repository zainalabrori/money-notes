<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import { notes } from '$lib/stores/notes';
	import { fade } from 'svelte/transition';
	import { pwa } from '$lib/stores/pwa.svelte';
	import type { Note } from '$lib/db/dexie';
	import { onMount } from 'svelte';

	let selectedNoteId = $state<number | null>(null);
	let isSidebarVisible = $state(true);

	const VAPID_PUBLIC_KEY = 'BATdT0XptowqM-WId6iTVFR9Iyn6XmBJrrTO6CIjLZBGG5JQduihLUZYk40eXLlTHXgsRwPZq7l_u79dabmARF4';

	let isNotificationSupported = $state(false);
	let isSubscribed = $state(false);

	onMount(() => {
		// Check API availability immediately (synchronous)
		isNotificationSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

		// Check existing subscription status asynchronously (with timeout to avoid hanging)
		if (isNotificationSupported && navigator.serviceWorker.controller) {
			const checkSubscription = async () => {
				try {
					const registration = await navigator.serviceWorker.ready;
					const existingSubscription = await registration.pushManager.getSubscription();
					isSubscribed = existingSubscription !== null;
				} catch (err) {
					console.error('Error checking push subscription:', err);
				}
			};
			checkSubscription();
		}
	});

	async function urlBase64ToUint8Array(base64String: string) {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

		const rawData = window.atob(base64);
		const outputArray = new Uint8Array(rawData.length);

		for (let i = 0; i < rawData.length; ++i) {
			outputArray[i] = rawData.charCodeAt(i);
		}
		return outputArray;
	}

	async function enableNotifications() {
		if (!isNotificationSupported) return;

		try {
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				alert('Izin notifikasi ditolak. Harap izinkan notifikasi di pengaturan browser Anda.');
				return;
			}

			const registration = await navigator.serviceWorker.ready;
			const subscribeOptions = {
				userVisibleOnly: true,
				applicationServerKey: await urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
			};

			const subscription = await registration.pushManager.subscribe(subscribeOptions);

			const res = await fetch('/api/push/subscribe', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(subscription)
			});

			if (res.ok) {
				isSubscribed = true;
				alert('Notifikasi berhasil diaktifkan! Tekan "./test-push.sh" untuk menguji.');
			} else {
				throw new Error('Gagal mengirim langganan ke server');
			}
		} catch (err: any) {
			console.error('Error enabling notifications:', err);
			alert('Terjadi kesalahan saat mengaktifkan notifikasi: ' + err.message);
		}
	}

	async function sendTestNotification() {
		try {
			const res = await fetch('/api/push/send-reminder', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title: 'Money Notes',
					body: 'Uji coba push notification berhasil! Aplikasi Anda kini bisa mengirim pengingat. 🚀'
				})
			});

			if (res.ok) {
				const result = await res.json();
				console.log('Test notification triggered:', result);
			} else {
				throw new Error('Gagal mengirim permintaan uji coba');
			}
		} catch (err: any) {
			console.error('Error sending test notification:', err);
			alert('Gagal mengirim notifikasi uji coba: ' + err.message);
		}
	}

	// Auto-select most recent note on mount or create one if empty
	$effect(() => {
		const unsubscribe = notes.subscribe((value) => {
			if (selectedNoteId === null && value.length > 0) {
				const sorted = [...value].sort((a, b) => b.updatedAt - a.updatedAt);
				selectedNoteId = sorted[0].id ?? null;
			} else if (value.length === 0) {
				notes.add().then((id) => {
					selectedNoteId = id;
				});
			}
		});
		return unsubscribe;
	});

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
			<div class="terminal-dots">
				<span class="dot red"></span>
				<span class="dot yellow"></span>
				<span class="dot green"></span>
			</div>

			{#if !isSidebarVisible}
				<button
					class="sidebar-toggle-btn"
					onclick={toggleSidebar}
					title="Open Sidebar (Ctrl+B)"
					transition:fade={{ duration: 150 }}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-panel-left-open"
						><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path
							d="m14 9 3 3-3 3"
						/></svg
					>
				</button>
			{/if}
			
			<div class="brand-logo">
				<span class="prompt-user">guest@money-notes</span>
				<span class="prompt-colon">:</span>
				<span class="prompt-dir">~/ledgers</span>
				<span class="prompt-char">$</span>
			</div>

			<div class="spacer"></div>

			{#if pwa.isInstallable}
				<button
					class="install-btn"
					onclick={() => pwa.install()}
					title="Install App"
					transition:fade={{ duration: 150 }}
				>
					<span>./install.sh</span>
				</button>
			{/if}

			{#if isNotificationSupported && !isSubscribed}
				<button
					class="install-btn notify-btn"
					onclick={enableNotifications}
					title="Aktifkan Pengingat Harian"
					transition:fade={{ duration: 150 }}
					style="margin-left: 8px;"
				>
					<span>./notify.sh</span>
				</button>
			{:else if isNotificationSupported && isSubscribed}
				<button
					class="install-btn notify-btn active"
					onclick={sendTestNotification}
					title="Kirim Notifikasi Uji Coba"
					transition:fade={{ duration: 150 }}
					style="margin-left: 8px;"
				>
					<span>./test-push.sh</span>
				</button>
			{:else if typeof window !== 'undefined' && !window.isSecureContext}
				<span
					style="font-size: 0.75rem; color: var(--text-tertiary); font-family: 'JetBrains Mono', monospace; margin-left: 8px; border: 1px dashed var(--border); padding: 4px 8px; border-radius: 4px;"
					title="Notification API requires HTTPS or localhost"
				>
					[http:// insecure context - notify.sh disabled]
				</span>
			{/if}
		</header>

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

	.top-bar {
		display: flex;
		align-items: center;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--border);
		gap: 0.75rem;
		height: 48px;
		background: var(--bg-secondary);
	}

	.terminal-dots {
		display: flex;
		gap: 6px;
		margin-right: 0.25rem;
		user-select: none;
	}

	.terminal-dots .dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		display: inline-block;
	}

	.terminal-dots .dot.red { background: #ff5f56; }
	.terminal-dots .dot.yellow { background: #ffbd2e; }
	.terminal-dots .dot.green { background: #27c93f; }

	.sidebar-toggle-btn {
		background: var(--bg-primary);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		padding: 4px 8px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.sidebar-toggle-btn:hover {
		color: var(--text-primary);
		background: var(--bg-tertiary);
		border-color: var(--text-secondary);
	}

	.brand-logo {
		display: flex;
		align-items: center;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.85rem;
		user-select: none;
	}

	.prompt-user {
		color: #5af78e;
		font-weight: 700;
	}

	.prompt-colon {
		color: var(--text-primary);
	}

	.prompt-dir {
		color: #57c7ff;
		font-weight: 700;
	}

	.prompt-char {
		color: var(--text-primary);
		margin-left: 4px;
	}

	.sidebar-backdrop {
		display: none;
	}

	.spacer {
		flex: 1;
	}

	.install-btn.notify-btn.active {
		color: #ff9900; /* amber/orange for testing */
	}

	.install-btn.notify-btn.active:hover {
		color: #ffb83d;
	}

	.install-btn {
		background: var(--bg-primary);
		border: 1px solid var(--border);
		color: var(--accent); /* green installer script link */
		padding: 4px 10px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		font-size: 0.8rem;
		font-weight: 700;
		font-family: 'JetBrains Mono', monospace;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.install-btn:hover {
		background: var(--bg-tertiary);
		color: var(--accent-light);
		border-color: var(--text-secondary);
	}

	.install-btn:active {
		transform: scale(0.98);
	}

	@media (max-width: 480px) {
		.install-btn {
			padding: 4px 6px;
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

	.empty-state {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
</style>
