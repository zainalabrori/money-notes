<script lang="ts">
	import { exportToJSON, exportToCSV, importFromJSON } from '../utils/backup';

	let fileInput: HTMLInputElement;

	async function handleImport(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			try {
				const count = await importFromJSON(target.files[0]);
				alert(`Successfully imported ${count} notes!`);
				target.value = '';
			} catch (err) {
				alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
			}
		}
	}
</script>

<div class="backup-section">
	<div class="btn-grid">
		<button onclick={exportToJSON} title="Download JSON Backup">JSON</button>
		<button onclick={exportToCSV} title="Export to CSV (Excel)">CSV</button>
		<button onclick={() => fileInput.click()} title="Restore from JSON">Import</button>
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
		background: var(--bg-primary);
	}

	.btn-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.4rem;
	}

	button {
		padding: 0.4rem;
		font-size: 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	button:hover {
		color: var(--text-primary);
		border-color: var(--accent);
		background: var(--bg-tertiary);
	}
</style>
