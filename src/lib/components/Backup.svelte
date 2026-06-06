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
	<span class="section-header">Cadangan &amp; Ekspor</span>
	<div class="btn-grid">
		<button onclick={exportToJSON} class="backup-btn" title="Unduh cadangan semua catatan (JSON)">
			<span>Simpan</span>
		</button>
		<button
			onclick={() => fileInput.click()}
			class="backup-btn"
			title="Pulihkan catatan dari file cadangan"
		>
			<span>Pulihkan</span>
		</button>
		<button
			onclick={exportToCSV}
			class="backup-btn"
			title="Ekspor semua catatan ke spreadsheet (CSV)"
		>
			<span>Ekspor CSV</span>
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
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--border);
		background: var(--bg-secondary);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.section-header {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		font-family: inherit;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.btn-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.4rem;
	}

	.backup-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px 4px;
		font-size: 0.75rem;
		font-family: inherit;
		background: var(--bg-primary);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		border-radius: 4px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.backup-btn:hover {
		color: var(--accent); /* green on hover */
		border-color: var(--text-secondary);
		background: var(--bg-tertiary);
	}
</style>
