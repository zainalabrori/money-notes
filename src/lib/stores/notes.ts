import { liveQuery } from 'dexie';
import { db, type Note } from '../db/dexie';

export const notes = {
	subscribe: (run: (value: Note[]) => void) => {
		const query = liveQuery(() => db.notes.toArray());
		const subscription = query.subscribe(run);
		return () => subscription.unsubscribe();
	},
	async add() {
		const id = await db.notes.add({
			title: 'New Note',
			content: '',
			tags: [],
			createdAt: Date.now(),
			updatedAt: Date.now()
		});
		return id;
	},
	async update(id: number, changes: Partial<Note>) {
		await db.notes.update(id, {
			...changes,
			updatedAt: Date.now()
		});
	},
	async delete(id: number) {
		await db.notes.delete(id);
	}
};
