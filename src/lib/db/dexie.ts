import Dexie, { type Table } from 'dexie';

export interface Note {
	id?: number;
	title: string;
	content: string;
	tags: string[];
	createdAt: number;
	updatedAt: number;
}

export class MoneyDB extends Dexie {
	notes!: Table<Note, number>;

	constructor() {
		super('money_notes');

		this.version(2).stores({
			notes: '++id, title, *tags, createdAt, updatedAt'
		});
	}
}

export const db = new MoneyDB();
