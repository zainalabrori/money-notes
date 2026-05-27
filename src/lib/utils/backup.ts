import { db, type Note } from '../db/dexie';

/**
 * Downloads a string as a file.
 */
function downloadFile(content: string, fileName: string, contentType: string) {
	const a = document.createElement('a');
	const file = new Blob([content], { type: contentType });
	a.href = URL.createObjectURL(file);
	a.download = fileName;
	a.click();
	URL.revokeObjectURL(a.href);
}

/**
 * Exports all notes to a JSON file.
 */
export async function exportToJSON() {
	const allNotes = await db.notes.toArray();
	const data = JSON.stringify(allNotes, null, 2);
	const date = new Date().toISOString().split('T')[0];
	downloadFile(data, `money-notes-backup-${date}.json`, 'application/json');
}

/**
 * Exports all notes to a CSV file.
 */
export async function exportToCSV() {
	const allNotes = await db.notes.toArray();
	if (allNotes.length === 0) return;

	const headers = ['title', 'content', 'tags', 'createdAt', 'updatedAt'];
	const csvRows = [
		headers.join(','),
		...allNotes.map((note) => {
			return [
				`"${note.title.replace(/"/g, '""')}"`,
				`"${note.content.replace(/"/g, '""')}"`,
				`"${(note.tags || []).join(', ')}"`,
				note.createdAt,
				note.updatedAt
			].join(',');
		})
	];

	const date = new Date().toISOString().split('T')[0];
	downloadFile(csvRows.join('\n'), `money-notes-${date}.csv`, 'text/csv');
}

/**
 * Imports notes from a JSON file.
 * Returns the number of imported notes.
 */
export async function importFromJSON(file: File): Promise<number> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				const content = e.target?.result as string;
				const importedNotes: Note[] = JSON.parse(content);

				if (!Array.isArray(importedNotes)) {
					throw new Error('Invalid backup format');
				}

				// Basic validation and stripping IDs to allow Dexie to generate new ones or overwrite
				// Here we choose to add them as new entries or we could use put to update
				await db.transaction('rw', db.notes, async () => {
					for (const note of importedNotes) {
						// Remove ID to avoid conflicts if importing into a different DB state,
						// or keep it if you want an exact mirror.
						// For backup/restore, we'll use 'put' to preserve/overwrite.
						await db.notes.put(note);
					}
				});

				resolve(importedNotes.length);
			} catch (err) {
				reject(err);
			}
		};
		reader.onerror = () => reject(new Error('File reading failed'));
		reader.readAsText(file);
	});
}
