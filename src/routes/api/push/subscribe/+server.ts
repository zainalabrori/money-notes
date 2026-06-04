import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// In-memory fallback for local development (stateless on production Workers, but useful for dev)
let devSubscriptions: any[] = [];

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const subscription = await request.json();

		if (!subscription || !subscription.endpoint) {
			return json({ error: 'Invalid subscription object' }, { status: 400 });
		}

		const cfPlatform = platform as any;

		// 1. If Cloudflare KV binding is available, store it there
		if (cfPlatform?.env?.KV) {
			const kv = cfPlatform.env.KV;
			// Use endpoint hash or url as key
			const key = `sub:${encodeURIComponent(subscription.endpoint)}`;
			await kv.put(key, JSON.stringify(subscription), {
				expirationTtl: 30 * 24 * 60 * 60 // Expire in 30 days
			});
		} 
		// 2. If Cloudflare D1 database binding is available, store it there
		else if (cfPlatform?.env?.DB) {
			const db = cfPlatform.env.DB;
			// Create table if it doesn't exist
			await db.prepare(`
				CREATE TABLE IF NOT EXISTS push_subscriptions (
					endpoint TEXT PRIMARY KEY,
					p256dh TEXT,
					auth TEXT,
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP
				)
			`).run();

			await db.prepare(`
				INSERT INTO push_subscriptions (endpoint, p256dh, auth)
				VALUES (?, ?, ?)
				ON CONFLICT(endpoint) DO UPDATE SET
					p256dh = excluded.p256dh,
					auth = excluded.auth
			`).bind(
				subscription.endpoint,
				subscription.keys?.p256dh || '',
				subscription.keys?.auth || ''
			).run();
		} 
		// 3. Fallback to in-memory for local dev
		else {
			const exists = devSubscriptions.some((s) => s.endpoint === subscription.endpoint);
			if (!exists) {
				devSubscriptions.push(subscription);
			}
			console.log('Stored subscription in memory. Total:', devSubscriptions.length);
		}

		return json({ success: true, message: 'Subscribed successfully' });
	} catch (err: any) {
		console.error('Subscription error:', err);
		return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
	}
};

// Export helper to retrieve subscriptions for sending push notifications
export async function _getSubscriptions(platform: any): Promise<any[]> {
	if (platform?.env?.KV) {
		const kv = platform.env.KV as any;
		const list = await kv.list({ prefix: 'sub:' });
		const subs = [];
		for (const key of list.keys) {
			const value = await kv.get(key.name);
			if (value) subs.push(JSON.parse(value));
		}
		return subs;
	} else if (platform?.env?.DB) {
		const db = platform.env.DB as any;
		try {
			const { results } = await db.prepare(`SELECT * FROM push_subscriptions`).all();
			return results.map((row: any) => ({
				endpoint: row.endpoint,
				keys: {
					p256dh: row.p256dh,
					auth: row.auth
				}
			}));
		} catch (e) {
			console.error('Error fetching from D1:', e);
			return [];
		}
	}
	return devSubscriptions;
}
