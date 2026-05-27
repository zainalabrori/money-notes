<script lang="ts">
	import { exportToJSON, exportToCSV, importFromJSON } from '../utils/backup';

	let fileInput: HTMLInputElement;

	async function handleImport(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			try {
				const count = await importFromJSON(target.files[0]);
				alert(`Berhasil mengimpor ${count} catatan keuangan!`);
				target.value = '';
			} catch (err) {
				alert('Impor gagal: ' + (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'));
			}
		}
	}
</script>

<div class="backup-section">
	<div class="btn-grid">
		<button onclick={exportToJSON} class="backup-btn" title="Unduh Backup JSON">
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
			<span>JSON</span>
		</button>
		<button onclick={exportToCSV} class="backup-btn" title="Ekspor ke CSV (Excel)">
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4M14 2v6h6M3 15h10M3 19h10"/></svg>
			<span>CSV</span>
		</button>
		<button onclick={() => fileInput.click()} class="backup-btn" title="Pulihkan Catatan dari JSON">
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
			<span>Impor</span>
		</button>
	</div>
	<input
		type="file"
		accept=".json"
		bind:this={fileInput}
		onchange={handleImport}
		style="display: none;"
	/>
</div>

<style>
	.backup-section {
		padding: 1rem;
		border-top: 1px solid var(--border);
		background: rgba(18, 24, 38, 0.5);
	}

	.btn-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
	}

	.backup-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.6rem 0.25rem;
		font-size: 0.7rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		border-radius: 6px;
		font-weight: 600;
		transition: all 0.2s ease;
	}

	.backup-btn:hover {
		color: var(--accent-light);
		border-color: var(--accent);
		background: var(--bg-tertiary);
		box-shadow: 0 0 8px var(--accent-glow);
	}
</style>
